const socket = io();

const usernameInput = document.getElementById('username');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const mediaForm = document.getElementById('media-form');
const mediaInput = document.getElementById('media-input');
const startCallBtn = document.getElementById('start-call');
const endCallBtn = document.getElementById('end-call');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

let peerConnection;
let localStream;

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const getUser = () => usernameInput.value.trim() || 'Anonymous';

const addMessage = (html) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  wrapper.innerHTML = html;
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', {
    user: getUser(),
    text
  });

  messageInput.value = '';
});

mediaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = mediaInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('media', file);
  formData.append('user', getUser());

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed.');
    }

    mediaInput.value = '';
  } catch (error) {
    addMessage(`<strong>System:</strong> ${error.message}`);
  }
});

const renderMedia = (media) => {
  if (media.type.startsWith('image/')) {
    return `<img src="${media.url}" alt="${media.name}" class="media-preview" />`;
  }
  if (media.type.startsWith('video/')) {
    return `<video controls class="media-preview"><source src="${media.url}" type="${media.type}" /></video>`;
  }
  if (media.type.startsWith('audio/')) {
    return `<audio controls src="${media.url}"></audio>`;
  }
  return `<a href="${media.url}" target="_blank" rel="noopener">${media.name}</a>`;
};

socket.on('chat-message', (msg) => {
  addMessage(`<strong>${msg.user}:</strong> ${msg.text}`);
});

socket.on('media-message', (msg) => {
  addMessage(`<strong>${msg.user} sent media:</strong><br/>${renderMedia(msg.media)}`);
});

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }
};

const ensureLocalStream = async () => {
  if (localStream) return;
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = localStream;
};

startCallBtn.addEventListener('click', async () => {
  try {
    await ensureLocalStream();
    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('video-offer', offer);

    addMessage('<strong>System:</strong> Calling...');
  } catch (error) {
    addMessage(`<strong>System:</strong> Camera/mic access error: ${error.message}`);
  }
});

endCallBtn.addEventListener('click', () => {
  socket.emit('end-call');
  stopCall();
});

const stopCall = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
};

socket.on('video-offer', async (offer) => {
  try {
    await ensureLocalStream();
    createPeerConnection();

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('video-answer', answer);

    addMessage('<strong>System:</strong> Incoming call connected.');
  } catch (error) {
    addMessage(`<strong>System:</strong> Could not answer call: ${error.message}`);
  }
});

socket.on('video-answer', async (answer) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(answer);
  addMessage('<strong>System:</strong> Call connected.');
});

socket.on('ice-candidate', async (candidate) => {
  if (!peerConnection) return;
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    addMessage(`<strong>System:</strong> ICE error: ${error.message}`);
  }
});

socket.on('end-call', () => {
  stopCall();
  addMessage('<strong>System:</strong> Remote user ended the call.');
});
