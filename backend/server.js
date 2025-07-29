import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import ffmpegPath from 'ffmpeg-static';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
const upload = multer({ dest: 'uploads/' });

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// AssemblyAI config
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const ASSEMBLYAI_TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';

if (!ASSEMBLYAI_API_KEY) {
  console.error('ERROR: ASSEMBLYAI_API_KEY is missing in .env');
  process.exit(1);
}

app.get('/', (req, res) => res.send('Speech-to-Text Backend is running ✅'));

// Upload & Transcribe
app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;

  // Convert to 16kHz mono WAV
  const ffmpegCmd = `"${ffmpegPath}" -y -i "${audioPath}" -ac 1 -ar 16000 -c:a pcm_s16le "${wavPath}"`;
  try {
    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (err, stdout, stderr) => {
        if (err) reject(stderr);
        else resolve(stdout);
      });
    });
  } catch (e) {
    fs.unlinkSync(audioPath);
    return res.status(500).json({ error: 'Audio conversion failed', details: e });
  }

  // Upload to AssemblyAI
  const audioData = fs.readFileSync(wavPath);
  let uploadUrl;
  try {
    const uploadRes = await fetch(ASSEMBLYAI_UPLOAD_URL, {
      method: 'POST',
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        'content-type': 'application/octet-stream',
      },
      body: audioData,
    });
    const uploadJson = await uploadRes.json();
    uploadUrl = uploadJson.upload_url;
  } catch (err) {
    cleanupFiles(audioPath, wavPath);
    return res.status(500).json({ error: 'Upload to AssemblyAI failed', details: err.message });
  }

  // Request transcription
  let transcriptId;
  try {
    const transcriptRes = await fetch(ASSEMBLYAI_TRANSCRIPT_URL, {
      method: 'POST',
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: uploadUrl }),
    });
    const transcriptJson = await transcriptRes.json();
    transcriptId = transcriptJson.id;
  } catch (err) {
    cleanupFiles(audioPath, wavPath);
    return res.status(500).json({ error: 'Transcript request failed', details: err.message });
  }

  // Poll for completion
  let transcription = '';
  try {
    transcription = await pollTranscription(transcriptId);
  } catch (err) {
    cleanupFiles(audioPath, wavPath);
    return res.status(500).json({ error: 'Transcription failed', details: err.message });
  }

  cleanupFiles(audioPath, wavPath);

  // Save in Supabase
  try {
    await supabase.from('transcripts').insert([{ transcription, language: 'en-US' }]);
  } catch (dbErr) {
    console.error('Supabase save error:', dbErr.message);
  }

  res.json({ text: transcription });
});

// Get last 10 transcripts
app.get('/transcripts', async (req, res) => {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE transcript by ID
app.delete('/transcripts/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('transcripts').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Transcript deleted' });
});

// Helpers
function cleanupFiles(...files) {
  files.forEach((file) => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}

async function pollTranscription(id) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${ASSEMBLYAI_TRANSCRIPT_URL}/${id}`, {
          headers: { authorization: ASSEMBLYAI_API_KEY },
        });
        const json = await res.json();
        if (json.status === 'completed') {
          clearInterval(interval);
          resolve(json.text);
        } else if (json.status === 'error') {
          clearInterval(interval);
          reject(new Error(json.error));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, 3000);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
