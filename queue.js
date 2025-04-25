console.log("🔥 queue.js is loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
  runTransaction, Timestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyA9HKUAEUg3-WgKjCYSL9zVVCj6nMOL2tE",
  authDomain: "pickleq.firebaseapp.com",
  projectId: "pickleq",
  storageBucket: "pickleq.firebasestorage.app",
  messagingSenderId: "1006103039653",
  appId: "1:1006103039653:web:2d021ce8bfcaf427ac874c",
  measurementId: "G-RL250FTMFF"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore document references
const queueRef = doc(db, "pickleballQ", "queue");
const chatRef = doc(db, "pickleballQ", "chat");

// UI Elements
const activePlayersEl = document.getElementById("activePlayers");
const pastPlayersEl = document.getElementById("pastPlayers");
const positionEl = document.getElementById("queuePosition");
const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const userNameInputEl = document.getElementById("userNameInput");
// const phoneInputEl = document.getElementById("phoneInput");
const nameModalEl = document.getElementById("nameModal");
const joinButtonEl = document.getElementById("joinButton");
const advanceControlsGroupEl = document.getElementById("advanceControlsGroup");
const advanceButtonEl = document.getElementById("advanceButton");   
const leaveButtonEl = document.getElementById("leaveButton");
const undoButtonEl = document.getElementById("undoButton");
const chatSendButtonEl = document.getElementById("chatSendButton");

// Local state
let userName = '';
let hasJoined = false;

// Firebase listeners
onSnapshot(queueRef, (docSnap) => {
  const data = docSnap.data();
  renderQueue(data.activePlayers || [], data.pastPlayers || []);
});

onSnapshot(chatRef, (docSnap) => {
  const messages = docSnap.data().messages || [];
  renderChat(messages);
});

// Utils
function generateUID() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function scrollToBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}

// Modal handling
function showNameModal() {
  const modal = document.getElementById("nameModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);
}

function hideModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
}

// Core logic
function setUserName() {
  const name = userNameInputEl.value.trim();
//   const phone = phoneInputEl.value.trim();

  if (!name) return alert("Please enter your name");

  let uid = localStorage.getItem("uid");
  if (!uid) {
    uid = generateUID();
    localStorage.setItem("uid", uid);
  }
  
  localStorage.setItem("uid", uid);
  localStorage.setItem("userName", name);
  userName = name;
  hasJoined = true;

  updateDoc(queueRef, {
    activePlayers: arrayUnion({
      name, uid, joinedAt: Timestamp.now()
    })
  });
  postSystemMessage(`${userName} joined the queue`);
  hideModal("nameModal");
}

async function leaveQueue() {
    const uid = localStorage.getItem("uid");
    const leavingName = localStorage.getItem("userName");
    if (!uid || !leavingName) return;
  
    // Remove them from activePlayers
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(queueRef);
      const players = snap.data().activePlayers || [];
      const match = players.find(p => p.uid === uid);
      if (match) {
        tx.update(queueRef, {
          activePlayers: arrayRemove(match)
        });
      }
    });
  
    // Post system message *before* wiping out userName
    postSystemMessage(`${leavingName} left the queue`);
  
    // Now clear local state
    hasJoined = false;
    userName = '';
    localStorage.removeItem("uid");
    localStorage.removeItem("userName");
    joinButtonEl.disabled = false;
    joinButtonEl.style.opacity = "1.0";
  }
  

function postMessage() {
    const msg = chatInputEl.value.trim();
    if (!msg || !userName) return;

    const chatEntry = {
        name: userName,
        uid: localStorage.getItem("uid"),
        message: msg,
        timestamp: Timestamp.now()
      };
      
    updateDoc(chatRef, {
      messages: arrayUnion(chatEntry)
    }).then(() => {
      chatInputEl.value = '';
    }).catch((err) => {
      console.error("❌ Failed to send chat:", err);
    });
  }
  
  async function rejoinQueue() {
    const uid  = localStorage.getItem("uid");
    const name = localStorage.getItem("userName");
    if (!uid || !name) return;
  
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(queueRef);
        const data = snap.data();
        const active = [...(data.activePlayers || [])];
        const past   = [...(data.pastPlayers   || [])];
  
        // remove any old past‑entry for this uid
        const newPast = past.filter(p => p.uid !== uid);
  
        // only add if not already in active
        if (!active.some(p => p.uid === uid)) {
          // try to preserve their old phone, if it was in past
          const old = past.find(p => p.uid === uid) || {};
          active.push({
            name,
            uid,
            joinedAt: Timestamp.now()
          });
        }
  
        tx.update(queueRef, {
          activePlayers: active,
          pastPlayers:   newPast
        });
      });
  
      postSystemMessage(`${name} rejoined the queue`);
    } catch (err) {
      console.error("❌ Error rejoining queue:", err);
    }
  }

// Rendering
function renderQueue(active, past) {
  activePlayersEl.innerHTML = '';
  pastPlayersEl.innerHTML   = '';

  const uid = localStorage.getItem("uid");
  // only show last 5
  const recentPast = past.slice(-3);
  const inActive   = active.some(p => p.uid === uid);
  const inPast     = recentPast.some(p => p.uid === uid);

  // render past
  recentPast.forEach(p => {
    const li = document.createElement("li");
    li.className   = 'crossed';
    li.textContent = p.name;
    pastPlayersEl.appendChild(li);
  });
  document.getElementById("pastPlayersHeader")
    .style.display = recentPast.length ? 'block' : 'none';

  // render active
  active.forEach((p,i) => {
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${p.name}`;
    if (p.uid === uid) li.classList.add("you");
    activePlayersEl.appendChild(li);
  });

  // always show the controls group if you’re in active OR recent‑past
  if (inActive || inPast) {
    hasJoined = true;
    userName  = localStorage.getItem("userName");
    advanceControlsGroupEl.style.display = 'flex';

    // always enable both buttons when visible
    advanceButtonEl.disabled = false;
    undoButtonEl.disabled    = false;
  } else {
    advanceControlsGroupEl.style.display = 'none';
  }

  // JOIN / REJOIN button logic:
  joinButtonEl.style.display = 'block';
  if (inActive) {
    joinButtonEl.textContent = 'Join Queue';
    joinButtonEl.disabled    = true;
    joinButtonEl.style.opacity = '0.6';
    joinButtonEl.onclick     = showNameModal;
  }
  else if (inPast) {
    joinButtonEl.textContent = 'Rejoin Queue';
    joinButtonEl.disabled    = false;
    joinButtonEl.style.opacity = '1.0';
    joinButtonEl.onclick     = rejoinQueue;
  }
  else {
    joinButtonEl.textContent = 'Join Queue';
    joinButtonEl.disabled    = false;
    joinButtonEl.style.opacity = '1.0';
    joinButtonEl.onclick     = showNameModal;
  }

  updateQueuePosition(active, uid);
}
  

  
  function updateQueuePosition(active, uid) {
    const position = active.findIndex(p => p.uid === uid);
  
    if (position !== -1) {
      positionEl.textContent = `You are ${ordinal(position + 1)} in line (${position} ahead of you)`;
      leaveButtonEl.style.display = 'block';
    } else {
      positionEl.textContent = '';
      leaveButtonEl.style.display = 'none';
    }
  
    // ✅ Always show advance/undo buttons
    advanceControlsGroupEl.style.display = hasJoined ? 'flex' : 'none';

  
    chatSendButtonEl.disabled = !hasJoined;
    chatInputEl.disabled = !hasJoined;
  }
  

  function renderChat(messages) {
    chatMessagesEl.innerHTML = '';
    const localUid = localStorage.getItem("uid");
  
    // ① Keep only the last 100 messages
    const recent = messages.slice(-100);
  
    // ② Sort oldest→newest and render
    recent
      .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds)
      .forEach(msg => {
        const div = document.createElement("div");
        if (msg.system) {
          div.className = "chat-msg system";
          div.textContent = `— ${msg.message} —`;
        } else {
          const isYou = msg.uid === localUid;
          div.className = `chat-msg ${isYou ? "you" : "other"}`;
          div.innerHTML = `<div><strong>${isYou ? "You" : msg.name}:</strong> ${msg.message}</div>`;
        }
        chatMessagesEl.appendChild(div);
      });
  
    // ③ Only scroll if the chat tab is currently visible
    const chatSection = document.getElementById("chatTab");
    if (chatSection.classList.contains("active")) {
      // delay one tick so the browser has actually laid out the new nodes
      setTimeout(() => scrollToBottom(chatMessagesEl), 0);
    }
  }
  
  
  

  function postSystemMessage(text) {
    updateDoc(chatRef, {
      messages: arrayUnion({
        system: true,
        message: text,
        timestamp: Timestamp.now(),
        uid: localStorage.getItem("uid") // ✅ Add this
      })
    });
  }
  
  

// Enter key for chat
chatInputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    postMessage();
  }
});

// On load, restore userName if available
window.addEventListener('DOMContentLoaded', () => {
  const uid = localStorage.getItem("uid");
  const storedName = localStorage.getItem("userName");
  if (uid && storedName) {
    userName = storedName;
    hasJoined = true;
  }
});

async function advanceQueue() {
    console.log("Advance queue triggered");
    let movedPlayer = null;
    let nextPlayer = null;
  
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(queueRef);
        const data = snap.data();
        const active = [...(data.activePlayers || [])];
        const past   = [...(data.pastPlayers   || [])];
  
        if (active.length === 0) return;
  
        movedPlayer = active.shift();    // who just got bumped off
        nextPlayer  = active[0] || null;  // who's now at front
        past.push(movedPlayer);
  
        tx.update(queueRef, {
          activePlayers: active,
          pastPlayers:   past
        });
      });
  
      if (movedPlayer) {
        const actor    = localStorage.getItem("userName") || "Someone";
        const nextName = nextPlayer ? nextPlayer.name : "no one";
        postSystemMessage(
          `${actor} clicked Next, ${nextName} is next up`
        );
        undoButtonEl.disabled = false;
      }
    } catch (err) {
      console.error("❌ Error advancing queue:", err);
    }
  }
  
  
  async function undoAdvanceQueue() {
    let returnedPlayer = null;
  
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(queueRef);
        const data = snap.data();
        const active = [...(data.activePlayers || [])];
        const past   = [...(data.pastPlayers   || [])];
  
        if (past.length === 0) return;
  
        // ✂️ Pop off the *last* advanced player, not the first
        returnedPlayer = past.pop();
        active.unshift(returnedPlayer);
  
        transaction.update(queueRef, {
          activePlayers: active,
          pastPlayers:   past
        });
      });
  
      if (returnedPlayer) {
        const actor = localStorage.getItem("userName") || "Someone";
        postSystemMessage(
          `${actor} undid the queue, ${returnedPlayer.name} is back at the front`
        );
      }
    } catch (err) {
      console.error("❌ Error undoing advance:", err);
    }
  }
  
  

  
  function showConfirmModal(action) {
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYesBtn");
  
    // Set confirmation message
    if (action === 'advance') {
      text.textContent = "Are you sure you want to advance the queue?";
    } else if (action === 'undo') {
      text.textContent = "Undo the last advance?";
    }
  
    // ✅ Set a one-time click handler
    yesBtn.onclick = () => {
      hideModal('confirmModal');
      if (action === 'advance') {
        console.log("✅ Advance confirmed");
        advanceQueue();
      } else if (action === 'undo') {
        console.log("✅ Undo confirmed");
        undoAdvanceQueue();
      }
    };
  
    // Show modal
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
  }
  

  
  function switchTab(tabName) {
    const tabs     = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.section');
  
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
  
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`)
            .classList.add('active');
    document.getElementById(`${tabName}Tab`)
            .classList.add('active');
  
    // If they just opened Chat, scroll to the bottom
    if (tabName === 'chat') {
      setTimeout(() => scrollToBottom(chatMessagesEl), 0);
    }
  }
  

// Expose functions to HTML
window.setUserName = setUserName;
window.showNameModal = showNameModal;
window.hideModal = hideModal;
window.leaveQueue = leaveQueue;
window.postMessage = postMessage;
window.advanceQueue = advanceQueue;
window.undoAdvanceQueue = undoAdvanceQueue;
window.switchTab = switchTab;
window.showConfirmModal = showConfirmModal;

