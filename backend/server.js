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

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
const upload = multer({ dest: 'uploads/' });

// Supabase config
const supabase = createClient(
  'https://qfefkrzxkqbwnudchbwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI'
);

// Root
app.get('/', (req, res) => res.send('Speech-to-Text Backend is running ✅'));

// Check if Vosk is available
app.get('/check-vosk', (req, res) => {
  exec('python3 -c "import vosk; print(vosk.__version__)"', (err, stdout, stderr) => {
    if (err) res.status(500).send(`Vosk NOT found: ${stderr || err.message}`);
    else res.send(`Vosk is installed. Version: ${stdout.trim()}`);
  });
});

// Handle file upload + conversion + transcription
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;
  const language = req.body.language || 'en-US';

  console.log(`🎤 Received: ${audioPath} | Language: ${language}`);

  exec(`"${ffmpegPath}" -y -i "${audioPath}" -ac 1 -ar 16000 -c:a pcm_s16le "${wavPath}"`, (ffmpegErr, stdout, stderr) => {
    if (ffmpegErr) {
      console.error('❌ FFmpeg error:', stderr);
      return res.status(500).json({ error: 'Audio conversion failed', details: stderr });
    }

    console.log(`🔊 Converted file ready: ${wavPath}`);

    exec(`python3 transcribe.py "${wavPath}" "${language}"`, async (pyErr, stdout, stderr) => {
      [audioPath, wavPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));

      if (pyErr) {
        console.error('❌ Transcription error:', stderr);
        return res.status(500).json({ error: 'Transcription failed', details: stderr });
      }

      const transcription = stdout.trim();
      console.log(`📝 Transcription: ${transcription}`);

      try {
        await supabase.from('transcripts').insert([{ transcription, language }]);
        console.log('✅ Saved to Supabase');
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

// Ping Render to keep alive
const RENDER_URL = 'https://speech-to-text-tgh8.onrender.com';
setInterval(() => fetch(RENDER_URL).catch(() => {}), 14 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
