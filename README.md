# 🎤 Speech-to-Text App

A full-stack **React (Vite) + Node.js** application that converts speech to text from **uploaded audio files**, **microphone recordings**, and **real-time live captions**.  
All transcriptions are stored in a **Supabase database** with history, search, and export options.

---

## ✨ Features
- Upload audio (MP3, WAV, WebM) and transcribe it.
- Record audio directly from your microphone.
- Real-time **Live Captions** (speech-to-text using browser speech recognition in Chrome).
- History Panel – view, search, and delete past transcriptions.
- Export transcriptions as **TXT** or **PDF**, or copy to clipboard.
- **Dark Mode** toggle for better UX.
- Currently supports **English (en-US)**.
- Backend uses **Vosk** for offline transcription.

---

## 🛠️ Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, React Icons  
- **Backend:** Node.js, Express.js, Vosk (offline ASR), Multer (file upload)  
- **Database:** Supabase (PostgreSQL)  
- **Other:** Axios, jsPDF (PDF export)

---

## 🌐 Live Demo
The app is live here:  
**[https://speech-to-text-theta-one.vercel.app](https://speech-to-text-theta-one.vercel.app)**

---

## 📦 Deployment
- **Frontend:** Deployed on Vercel  
- **Backend:** Deployed on Render  
- **Database:** Supabase (hosted PostgreSQL)  

---

## 📝 License
This project is for educational purposes (BCA Final Year Project).  
