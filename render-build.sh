#!/usr/bin/env bash
# Runs before your app starts on Render.

# Install required packages
apt-get update && apt-get install -y ffmpeg python3 python3-pip

# Always reinstall Python dependencies (no cache)
pip3 install --no-cache-dir -r backend/requirements.txt

