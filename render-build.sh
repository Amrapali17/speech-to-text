#!/usr/bin/env bash
# This script runs on Render before your app starts.

# Update packages
apt-get update && apt-get install -y ffmpeg python3 python3-pip

# Install Python packages (vosk + soundfile for transcription)
pip3 install vosk soundfile

