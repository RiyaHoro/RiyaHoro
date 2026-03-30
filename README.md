# Realtime Chat + Media + Video Call App

A simple web app where people can:

- Chat in realtime.
- Send media files (images, video, audio, and other files).
- Start peer-to-peer video calls.

## Tech Stack

- Node.js + Express
- Socket.IO for realtime chat/signaling
- Multer for media uploads
- WebRTC for video calls

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open in browser:
   ```
   http://localhost:3000
   ```

## Notes

- Upload limit is set to 15MB per file.
- For video calls, allow microphone and camera permissions in your browser.
- Use two browser tabs/windows (or two devices) to test calling.
