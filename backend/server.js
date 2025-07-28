import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Allow frontend access (replace "*" with your frontend URL for security)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

const upload = multer({ dest: 'uploads/' });

// Supabase
const supabaseUrl = 'https://qfefkrzxkqbwnudchbwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/', (req, res) => {
  res.send('Speech-to-Text Backend is running ✅');
});

// Upload audio
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;
  const language = req.body.language || 'en-US';

  console.log(`🎤 Uploaded: ${audioPath} | Language: ${language}`);

  exec(`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`, (ffmpegErr) => {
    if (ffmpegErr) return res.status(500).json({ error: 'Audio conversion failed' });

    exec(`python3 transcribe.py "${wavPath}" "${language}"`, async (pyErr, stdout, stderr) => {
      if (pyErr) return res.status(500).json({ error: 'Transcription failed' });

      const transcription = stdout.trim();

      try {
        await supabase.from('transcripts').insert([{ transcription, language }]);
      } catch (err) {
        console.error('❌ DB Error:', err.message);
      }

      res.json({ text: transcription || 'No text detected' });
      [audioPath, wavPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    });
  });
});

// Fetch transcripts
app.get('/transcripts', async (req, res) => {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Keep Render awake
const RENDER_URL = 'https://speech-to-text-tgh8.onrender.com';
setInterval(() => fetch(RENDER_URL).then(() => console.log('🔄 Pinged Render')), 14 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
