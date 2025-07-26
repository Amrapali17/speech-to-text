import os
import subprocess
import sys
import wave
import json
from vosk import Model, KaldiRecognizer

# Path to your Vosk model (English by default)
MODEL_PATH = "models/vosk-model-small-en-us-0.15"
OUTPUT_RAW = "recorded.wav"
OUTPUT_CONVERTED = "recorded_converted.wav"

def record_audio(seconds=5):
    """Record audio from the MacBook microphone using ffmpeg"""
    print(f"Recording {seconds} seconds of audio...")
    subprocess.run([
        "ffmpeg", "-y", "-f", "avfoundation", "-i", ":0", "-t", str(seconds), OUTPUT_RAW
    ], check=True)

def convert_audio():
    """Convert to mono 16kHz PCM (Vosk requirement)"""
    print("Converting audio to 16kHz mono...")
    subprocess.run([
        "ffmpeg", "-y", "-i", OUTPUT_RAW, "-ac", "1", "-ar", "16000", OUTPUT_CONVERTED
    ], check=True)

def transcribe_audio(file_path):
    """Transcribe audio file using Vosk"""
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found at {MODEL_PATH}")
        return

    wf = wave.open(file_path, "rb")
    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
        print("Audio must be mono PCM WAV 16kHz")
        return

    model = Model(MODEL_PATH)
    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(True)

    print("\n--- Transcription Result ---")
    results = []
    while True:
        data = wf.readframes(4000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            results.append(json.loads(rec.Result()))
    results.append(json.loads(rec.FinalResult()))

    text = " ".join(r.get("text", "") for r in results)
    print(text or "[No speech detected]")

if __name__ == "__main__":
    record_audio(5)       # Step 1: Record 5 seconds
    convert_audio()       # Step 2: Convert for Vosk
    transcribe_audio(OUTPUT_CONVERTED)  # Step 3: Transcribe
