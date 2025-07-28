// backend/download-model.js
import fs from "fs";
import { execSync } from "child_process";

const MODEL_DIR = "models/vosk-model-small-en-us-0.15";
const MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";

if (!fs.existsSync(MODEL_DIR)) {
  console.log(`Model not found, downloading...`);
  execSync(`mkdir -p models && curl -L -o models/model.zip ${MODEL_URL}`, { stdio: "inherit" });
  console.log(`Unzipping model...`);
  execSync(`cd models && unzip -o model.zip && rm model.zip`, { stdio: "inherit" });
  console.log(`Model downloaded and extracted.`);
} else {
  console.log(`Model already present.`);
}

