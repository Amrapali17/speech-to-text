#!/usr/bin/env bash
# This script runs on Render before your app starts.

# Update system packages and install ffmpeg + python
apt-get update && apt-get install -y ffmpeg python3 python3-pip

# Install all Python dependencies from our requirements.txt
pip3 install -r backend/requirements.txt

