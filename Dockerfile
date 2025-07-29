# Use Node.js 18 with Debian (so apt-get works)
FROM node:18-bullseye

# Install Python, pip, ffmpeg, and system deps
RUN apt-get update && apt-get install -y \
  python3 python3-pip ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy backend files
COPY backend ./backend

# Install Node dependencies
WORKDIR /app/backend
RUN npm install

# Install Python dependencies (vosk, numpy, soundfile)
RUN pip3 install --no-cache-dir -r requirements.txt

# Download Vosk model during build (optional)
RUN node download-model.js

# Expose port (Render will use $PORT)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]

