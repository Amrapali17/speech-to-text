import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Initialize multer as an instance (not middleware yet)
const upload = multer({ dest: 'uploads/' });

// Supabase setup
const supabaseUrl = 'https://qfefkrzxkqbwnudchbwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWZrcnp4a3Fid251ZGNoYndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTYzMzEsImV4cCI6MjA2ODkzMjMzMX0.pOu76z96868RL9BQEbf7ZSOV08RJVxTRRRLI1GxjXpI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check route
app.get('/', (req, res) => {
  res.send('Speech-to-Text Backend is running ✅');
});

// Upload endpoint (transcription)
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;
  const language = req.body.language || 'en-US';

  console.log(`🎤 File uploaded: ${audioPath} | Language: ${language}`);

  // Step 1: Convert audio to WAV mono 16kHz using ffmpeg
  exec(`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`, (ffmpegErr) => {
    if (ffmpegErr) {
      console.error('❌ FFmpeg conversion failed:', ffmpegErr);
      return res.status(500).json({ error: 'Audio conversion failed' });
    }

    console.log(`🔊 Converted to WAV: ${wavPath}`);

    // Step 2: Run Python transcription
    exec(`python3 transcribe.py "${wavPath}" "${language}"`, async (pyErr, stdout, stderr) => {
      if (pyErr) {
        console.error('❌ Vosk transcription failed:', stderr);
        return res.status(500).json({ error: 'Transcription failed' });
      }

      const transcription = stdout.trim();
      console.log(`📝 Transcription [${language}]: ${transcription}`);

      // Save to Supabase
      try {
        const { data: saved, error: dbError } = await supabase
          .from('transcripts')
          .insert([{ transcription, language }])
          .select();

        if (dbError) {
          console.error('❌ Error saving to Supabase:', dbError.message);
        } else {
          console.log('✅ Saved to Supabase:', saved);
        }
      } catch (err) {
        console.error('❌ Database insert error:', err.message);
      }

      // Respond to client
      res.json({ text: transcription || 'No text detected' });

      // Cleanup
      [audioPath, wavPath].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
    });
  });
});

// Endpoint to fetch saved transcripts
app.get('/transcripts', async (req, res) => {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
