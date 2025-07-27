const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('audio'), (req, res) => {
  const audioPath = path.resolve(req.file.path);
  const wavPath = `${audioPath}.wav`;
  const language = req.body.language || 'en-US'; // Default to English

  console.log(`File uploaded: ${audioPath} | Language: ${language}`);

  // Step 1: Convert audio to WAV mono 16kHz
  exec(`ffmpeg -y -i "${audioPath}" -ar 16000 -ac 1 "${wavPath}"`, (ffmpegErr) => {
    if (ffmpegErr) {
      console.error('FFmpeg conversion failed:', ffmpegErr);
      return res.status(500).json({ error: 'Audio conversion failed' });
    }

    console.log(`Converted to WAV: ${wavPath}`);

    // Step 2: Run Python transcription with language argument
    exec(`python3 transcribe.py "${wavPath}" "${language}"`, (pyErr, stdout, stderr) => {
      if (pyErr) {
        console.error('Vosk transcription failed:', stderr);
        return res.status(500).json({ error: 'Transcription failed' });
      }

      const transcription = stdout.trim();
      console.log(`Transcription [${language}]:`, transcription);

      res.json({ text: transcription || 'No text detected' });

      // Cleanup
      [audioPath, wavPath].forEach((file) => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
    });
  });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

