const chatArea = document.getElementById("chat-area");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingStatus = document.getElementById("typing-status");
const themeToggle = document.getElementById("themeToggle");
const statusIndicator = document.getElementById("status-indicator");
const imageInput = document.getElementById("imageInput");

let peerConnection;
let dataChannel;
let isTyping = false;
let isInitiator = location.hash === "#init";

// Toggle Theme
themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

// Load Theme from localStorage
window.onload = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
};

// WebRTC Connection
function createConnection() {
  peerConnection = new RTCPeerConnection();

  if (isInitiator) {
    dataChannel = peerConnection.createDataChannel("chat");
    setupChannel();
    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer);
      alert("Send this offer to peer:\n" + JSON.stringify(offer));
    });
  } else {
    peerConnection.ondatachannel = e => {
      dataChannel = e.channel;
      setupChannel();
    };
  }

  peerConnection.onicecandidate = e => {
    if (!e.candidate) {
      alert("Send this answer to initiator:\n" + JSON.stringify(peerConnection.localDescription));
    }
  };
}

// Setup data channel
function setupChannel() {
  dataChannel.onopen = () => {
    statusIndicator.textContent = "Online";
    statusIndicator.classList.remove("offline");
    statusIndicator.classList.add("online");
  };

  dataChannel.onclose = () => {
    statusIndicator.textContent = "Offline";
    statusIndicator.classList.remove("online");
    statusIndicator.classList.add("offline");
  };

  dataChannel.onmessage = e => {
    const msg = JSON.parse(e.data);

    if (msg.typing) {
      typingStatus.style.display = "block";
      return;
    }

    typingStatus.style.display = "none";

    if (msg.image) {
      appendImage("them", msg.image);
    } else {
      appendMessage("them", decryptMessage(msg.text));
    }

    setTimeout(() => {
      chatArea.innerHTML = "";
    }, 60000);
  };
}

// Send button
sendBtn.onclick = () => {
  if (!dataChannel || messageInput.value.trim() === "") return;
  sendMessage();
};

// Enter key to send
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && messageInput.value.trim() !== "") {
    e.preventDefault(); // Prevent default newline behavior
    sendMessage();
  }
});

// Send message logic
function sendMessage() {
  if (!dataChannel || messageInput.value.trim() === "") return;
  const message = messageInput.value;
  const encrypted = encryptMessage(message);
  dataChannel.send(JSON.stringify({ text: encrypted }));
  appendMessage("you", message);
  messageInput.value = "";
}

// Typing indicator
messageInput.oninput = () => {
  if (!dataChannel) return;
  if (!isTyping) {
    dataChannel.send(JSON.stringify({ typing: true }));
    isTyping = true;
    setTimeout(() => (isTyping = false), 2000);
  }
};

// Handle image input
imageInput.onchange = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    const imageData = reader.result;
    dataChannel.send(JSON.stringify({ image: imageData }));
    appendImage("you", imageData);
  };
  reader.readAsDataURL(file);
};

// Append text message
function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Append image message
function appendImage(sender, imageData) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  const img = document.createElement("img");
  img.src = imageData;
  img.style.maxWidth = "200px";
  img.style.borderRadius = "15px";
  div.appendChild(img);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

createConnection();
