# 🎤 Speech-to-Text App

A full-stack **React + Node.js** application that converts speech to text from **uploaded audio files**, **microphone recordings**, and **real-time live captions**.  
All transcriptions are stored in a **Supabase database** with history, search, and export options.

---

## ✨ Features
- Upload audio (MP3, WAV, WebM) and transcribe.
- Record audio directly from your microphone.
- Real-time **Live Captions** (speech-to-text using browser speech recognition).
- History Panel – search and delete past transcriptions.
- Export transcriptions as **TXT** or **PDF**, or copy to clipboard.
- **Dark Mode** toggle.
- Supports multiple languages (`en-US`, `hi-IN`).
- Backend uses **Vosk** for offline transcription.

---

## 🛠️ Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, React Icons  
- **Backend:** Node.js, Express, Vosk, Multer (file upload)  
- **Database:** Supabase (PostgreSQL)  
- **Other:** Axios, jsPDF (for PDF export)

---

## 🚀 Getting Started (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/Amrapali17/speech-to-text-app.git
cd speech-to-text-app

