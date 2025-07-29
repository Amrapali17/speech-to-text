import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import ffmpegPath from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Allow frontend (replace '*' with your frontend domain for security)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

const upload = multer({ dest: 'uploads/' });

// Supabase setup
const supabaseUrl = 'https://qfefkrzxkqbwnudchbwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check
app.get('/', (req, res) => {
  res.send('Speech-to-Text Backend is running ✅');
});

// Debug: Check Vosk
app.get('/check-vosk', (req, res) => {
  exec('python3 -c "import vosk; print(vosk.__version__)"', (err, stdout, stderr) => {
    if (err) {
      return res.status(500).send(`Vosk NOT found: ${stderr || err.message}`);
    }
    res.send(`Vosk is installed. Version: ${stdout.trim()}`);
  });
});

// Upload & Transcribe
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;
  const language = req.body.language || 'en-US';

  console.log(`🎤 Received: ${audioPath} | Language: ${language}`);

  // Convert audio to mono 16kHz WAV
  exec(`"${ffmpegPath}" -y -i "${audioPath}" -ac 1 -ar 16000 -c:a pcm_s16le "${wavPath}"`, (ffmpegErr, stdout, stderr) => {
    if (ffmpegErr) {
      console.error('❌ FFmpeg error:', stderr);
      return res.status(500).json({ error: 'Audio conversion failed', details: stderr });
    }
    console.log(`🔊 Converted to: ${wavPath}`);

    exec(`python3 transcribe.py "${wavPath}" "${language}"`, async (pyErr, stdout, stderr) => {
      [audioPath, wavPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f)); // Cleanup files

      if (pyErr) {
        console.error('❌ Transcription error:', stderr);
        return res.status(500).json({ error: 'Transcription failed', details: stderr });
      }

      const transcription = stdout.trim();
      console.log(`📝 Transcription result: ${transcription}`);

      try {
        await supabase.from('transcripts').insert([{ transcription, language }]);
        console.log('✅ Saved transcription to Supabase');
      } catch (dbErr) {
        console.error('❌ Database error:', dbErr.message);
      }

      res.json({ text: transcription || 'No text detected' });
    });
  });
});

// Fetch latest transcripts
app.get('/transcripts', async (req, res) => {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Keep the Render service awake
const RENDER_URL = 'https://speech-to-text-tgh8.onrender.com';
setInterval(() => {
  fetch(RENDER_URL)
    .then(() => console.log('🔄 Pinged Render'))
    .catch(() => {});
}, 14 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
