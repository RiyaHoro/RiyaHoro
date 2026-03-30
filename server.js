const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (_, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const media = {
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype,
    name: req.file.originalname
  };

  io.emit('media-message', {
    user: req.body.user || 'Anonymous',
    media,
    timestamp: new Date().toISOString()
  });

  return res.status(201).json(media);
});

io.on('connection', (socket) => {
  socket.on('chat-message', (payload) => {
    io.emit('chat-message', {
      user: payload.user || 'Anonymous',
      text: payload.text,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('video-offer', (offer) => {
    socket.broadcast.emit('video-offer', offer);
  });

  socket.on('video-answer', (answer) => {
    socket.broadcast.emit('video-answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('end-call', () => {
    socket.broadcast.emit('end-call');
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
