import sys
import wave
import json
from vosk import Model, KaldiRecognizer
import os

# Supported language models (make sure these are downloaded)
LANGUAGE_MODELS = {
    "en-US": "models/vosk-model-small-en-us-0.15",
    "hi-IN": "models/vosk-model-small-hi-0.22",
    "mr-IN": "models/vosk-model-small-mr-0.4"
}

def transcribe(file_path, language="en-US"):
    # Pick model path or default to English
    model_path = LANGUAGE_MODELS.get(language, LANGUAGE_MODELS["en-US"])
    if not os.path.exists(model_path):
        model_path = LANGUAGE_MODELS["en-US"]

    model = Model(model_path)

    try:
        wf = wave.open(file_path, "rb")
    except FileNotFoundError:
        print("", end="")  # Node will handle
        return

    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
        print("", end="")
        return

    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(True)

    results = []
    while True:
        data = wf.readframes(4000)
        if not data:
            break
        if rec.AcceptWaveform(data):
            results.append(json.loads(rec.Result()))
    results.append(json.loads(rec.FinalResult()))

    text = " ".join(r.get("text", "") for r in results if "text" in r).strip()
    print(text, end="")  # Output only transcript for Node

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("", end="")
    else:
        file_path = sys.argv[1]
        language = sys.argv[2] if len(sys.argv) > 2 else "en-US"
        transcribe(file_path, language)
