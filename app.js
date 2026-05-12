/* =========================================================
   Student AI Chatbot - app.js
   Uses Puter.js for free, keyless access to multiple LLMs.
   https://developer.puter.com/
   ========================================================= */

// ---------- System prompts per study mode ----------
const SYSTEM_PROMPTS = {
  tutor:
    "You are a patient, friendly student tutor. Explain concepts step by step, " +
    "use simple language, give short examples, and check understanding. Use " +
    "markdown with headings, lists, and code blocks when helpful.",
  homework:
    "You are a homework helper. Guide the student through problems step by step " +
    "instead of just giving answers. Ask what they've tried, point out mistakes " +
    "gently, and encourage learning. Use markdown.",
  writer:
    "You are a writing and essay coach. Help the student brainstorm, outline, " +
    "improve grammar, and strengthen arguments. Give constructive feedback and " +
    "suggest improvements. Use markdown.",
  math:
    "You are a math and science tutor. Show all steps clearly, use LaTeX-style " +
    "math with $...$ or $$...$$ when useful, and explain the reasoning behind each " +
    "step. Use markdown.",
  code:
    "You are a coding helper for students. Explain code concepts clearly, help " +
    "debug errors, and give well-commented examples. Prefer simple, readable code. " +
    "Use markdown with fenced code blocks and language tags.",
  quiz:
    "You are a quiz master. Ask the student one question at a time on the topic " +
    "they choose. Wait for their answer, tell them if it's right, explain why, " +
    "and then move to the next question. Use markdown.",
  summary:
    "You are a study-notes assistant. Summarize the user's text or topic into " +
    "concise bullet points, key terms, and a short recap. Use markdown.",
  free:
    "You are a helpful, friendly AI assistant for a student. Answer clearly and " +
    "concisely. Use markdown when helpful.",
};

// ---------- State ----------
const STORAGE_KEY = "student_ai_chats_v1";
const THEME_KEY = "student_ai_theme";

let chats = loadChats();       // { [id]: { id, title, messages: [{role, content}], model, mode, updatedAt } }
let currentChatId = null;
let isSending = false;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const elMessages   = $("messages");
const elForm       = $("inputForm");
const elInput      = $("userInput");
const elSendBtn    = $("sendBtn");
const elModel      = $("modelSelect");
const elMode       = $("modeSelect");
const elNewChat    = $("newChatBtn");
const elChatList   = $("chatList");
const elClearAll   = $("clearAllBtn");
const elChatTitle  = $("chatTitle");
const elToggleSide = $("toggleSidebar");
const elSidebar    = $("sidebar");
const elThemeBtn   = $("themeBtn");

// ---------- Markdown / sanitize setup ----------
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: (code, lang) => {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  },
});

function renderMarkdown(text) {
  const raw = marked.parse(text || "");
  return DOMPurify.sanitize(raw);
}

// ---------- Storage ----------
function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

// ---------- Theme ----------
function applyTheme(theme) {
  if (theme === "light") {
    document.body.setAttribute("data-theme", "light");
  } else {
    document.body.removeAttribute("data-theme");
  }
}
applyTheme(localStorage.getItem(THEME_KEY) || "dark");
elThemeBtn.addEventListener("click", () => {
  const current = localStorage.getItem(THEME_KEY) || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

// ---------- Chat management ----------
function newChatId() {
  return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function createNewChat() {
  const id = newChatId();
  chats[id] = {
    id,
    title: "New Chat",
    messages: [],
    model: elModel.value,
    mode:  elMode.value,
    updatedAt: Date.now(),
  };
  currentChatId = id;
  saveChats();
  renderChatList();
  renderMessages();
}

function deleteChat(id) {
  delete chats[id];
  saveChats();
  if (currentChatId === id) {
    const remaining = Object.keys(chats);
    if (remaining.length) {
      currentChatId = remaining[0];
    } else {
      createNewChat();
      return;
    }
  }
  renderChatList();
  renderMessages();
}

function switchChat(id) {
  currentChatId = id;
  const chat = chats[id];
  if (chat) {
    elModel.value = chat.model || elModel.value;
    elMode.value  = chat.mode  || elMode.value;
  }
  renderChatList();
  renderMessages();
  // On mobile, close sidebar after picking
  if (window.innerWidth <= 820) elSidebar.classList.remove("open");
}

function getCurrentChat() {
  if (!currentChatId || !chats[currentChatId]) {
    // Recover gracefully
    const ids = Object.keys(chats);
    if (ids.length) {
      currentChatId = ids.sort((a, b) => chats[b].updatedAt - chats[a].updatedAt)[0];
    } else {
      createNewChat();
    }
  }
  return chats[currentChatId];
}

function updateChatTitleFromFirstMessage(chat) {
  if (chat.title && chat.title !== "New Chat") return;
  const firstUser = chat.messages.find((m) => m.role === "user");
  if (firstUser) {
    chat.title = firstUser.content.slice(0, 40).replace(/\s+/g, " ").trim() ||
                 "New Chat";
  }
}

// ---------- Rendering ----------
function renderChatList() {
  elChatList.innerHTML = "";
  const sorted = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const c of sorted) {
    const li = document.createElement("li");
    if (c.id === currentChatId) li.classList.add("active");
    li.innerHTML = `
      <span class="title"></span>
      <button class="delete-chat" title="Delete chat">&times;</button>
    `;
    li.querySelector(".title").textContent = c.title || "New Chat";
    li.addEventListener("click", () => switchChat(c.id));
    li.querySelector(".delete-chat").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) deleteChat(c.id);
    });
    elChatList.appendChild(li);
  }
}

function renderMessages() {
  const chat = getCurrentChat();
  elChatTitle.textContent = chat.title || "New Chat";
  elMessages.innerHTML = "";

  if (!chat.messages.length) {
    renderWelcome();
    return;
  }

  for (const msg of chat.messages) {
    appendMessageEl(msg.role, msg.content);
  }
  scrollToBottom();
}

function renderWelcome() {
  elMessages.innerHTML = `
    <div class="welcome">
      <h2>Hi! I'm your Student AI Assistant</h2>
      <p>Ask me anything — homework, essays, math, coding, science, or study tips.</p>
      <div class="suggestions">
        <button class="suggestion">Explain photosynthesis like I'm 12</button>
        <button class="suggestion">Help me solve: 2x + 5 = 17</button>
        <button class="suggestion">Write a thesis statement about climate change</button>
        <button class="suggestion">Quiz me on World War II</button>
      </div>
    </div>
  `;
  elMessages.querySelectorAll(".suggestion").forEach((btn) => {
    btn.addEventListener("click", () => {
      elInput.value = btn.textContent;
      elInput.focus();
      autoGrow();
    });
  });
}

function appendMessageEl(role, content) {
  const wrap = document.createElement("div");
  wrap.className = "message " + (role === "user" ? "user" : "bot");
  wrap.innerHTML = `
    <div class="avatar">${role === "user" ? "You" : "AI"}</div>
    <div class="bubble"></div>
  `;
  const bubble = wrap.querySelector(".bubble");
  if (role === "assistant" || role === "bot") {
    bubble.innerHTML = renderMarkdown(content);
    bubble.querySelectorAll("pre code").forEach((b) => hljs.highlightElement(b));
  } else {
    // Keep user content as plain text (safer, avoids accidental markdown)
    bubble.textContent = content;
  }
  elMessages.appendChild(wrap);
  return { wrap, bubble };
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message bot";
  wrap.innerHTML = `
    <div class="avatar">AI</div>
    <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>
  `;
  elMessages.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function scrollToBottom() {
  elMessages.scrollTop = elMessages.scrollHeight;
}

// ---------- Sending ----------
function buildMessagesForModel(chat) {
  const system = SYSTEM_PROMPTS[chat.mode] || SYSTEM_PROMPTS.tutor;
  const history = chat.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  return [{ role: "system", content: system }, ...history];
}

async function sendMessage(userText) {
  if (!userText || isSending) return;
  if (typeof puter === "undefined" || !puter?.ai?.chat) {
    alert(
      "Puter.js failed to load. Please check your internet connection and refresh."
    );
    return;
  }

  const chat = getCurrentChat();
  chat.model = elModel.value;
  chat.mode  = elMode.value;

  chat.messages.push({ role: "user", content: userText });
  updateChatTitleFromFirstMessage(chat);
  chat.updatedAt = Date.now();
  saveChats();

  // If the UI still shows the welcome screen, swap to messages view
  if (elMessages.querySelector(".welcome")) elMessages.innerHTML = "";

  appendMessageEl("user", userText);
  renderChatList();
  scrollToBottom();

  const typingEl = appendTyping();
  setSending(true);

  let assistantText = "";
  try {
    const messages = buildMessagesForModel(chat);
    // Puter.js streaming chat
    const response = await puter.ai.chat(messages, {
      model: chat.model,
      stream: true,
    });

    // Replace typing with real bubble once we have data
    let bubble = null;
    const ensureBubble = () => {
      if (bubble) return bubble;
      typingEl.remove();
      const { bubble: b } = appendMessageEl("assistant", "");
      bubble = b;
      return bubble;
    };

    for await (const part of response) {
      // Puter streaming chunks expose .text (string) for text deltas
      const chunk =
        (part && typeof part === "object" && "text" in part && part.text) ||
        (typeof part === "string" ? part : "");
      if (!chunk) continue;
      assistantText += chunk;
      const b = ensureBubble();
      b.innerHTML = renderMarkdown(assistantText);
      scrollToBottom();
    }

    // Highlight code after final render
    if (bubble) {
      bubble.querySelectorAll("pre code").forEach((el) => hljs.highlightElement(el));
    } else {
      // No streamed content — fall back to showing an error bubble
      typingEl.remove();
      const { bubble: b } = appendMessageEl(
        "assistant",
        "_(No response received. Try again or switch models.)_"
      );
      bubble = b;
    }
  } catch (err) {
    console.error(err);
    typingEl.remove();
    const msg =
      "**Oops — something went wrong.**\n\n" +
      "```\n" +
      (err?.message || String(err)) +
      "\n```\n\n" +
      "Tips:\n" +
      "- Check your internet connection\n" +
      "- Try a different model from the sidebar\n" +
      "- If prompted, sign in to Puter (free) to continue";
    appendMessageEl("assistant", msg);
    assistantText = msg;
  } finally {
    setSending(false);
  }

  if (assistantText) {
    chat.messages.push({ role: "assistant", content: assistantText });
    chat.updatedAt = Date.now();
    saveChats();
    renderChatList();
  }
}

function setSending(sending) {
  isSending = sending;
  elSendBtn.disabled = sending;
  elInput.disabled = sending;
}

// ---------- Input handling ----------
function autoGrow() {
  elInput.style.height = "auto";
  elInput.style.height = Math.min(elInput.scrollHeight, 200) + "px";
}

elInput.addEventListener("input", autoGrow);

elInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    elForm.requestSubmit();
  }
});

elForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = elInput.value.trim();
  if (!text) return;
  elInput.value = "";
  autoGrow();
  sendMessage(text);
});

// ---------- Sidebar actions ----------
elNewChat.addEventListener("click", () => {
  createNewChat();
  elInput.focus();
});

elClearAll.addEventListener("click", () => {
  if (!Object.keys(chats).length) return;
  if (confirm("Delete ALL chats? This cannot be undone.")) {
    chats = {};
    saveChats();
    createNewChat();
  }
});

elToggleSide.addEventListener("click", () => {
  elSidebar.classList.toggle("open");
});

elModel.addEventListener("change", () => {
  const c = getCurrentChat();
  c.model = elModel.value;
  saveChats();
});

elMode.addEventListener("change", () => {
  const c = getCurrentChat();
  c.mode = elMode.value;
  saveChats();
});

// ---------- Init ----------
function init() {
  const ids = Object.keys(chats);
  if (ids.length) {
    currentChatId = ids.sort((a, b) => chats[b].updatedAt - chats[a].updatedAt)[0];
    const c = chats[currentChatId];
    elModel.value = c.model || elModel.value;
    elMode.value  = c.mode  || elMode.value;
  } else {
    createNewChat();
  }
  renderChatList();
  renderMessages();
  autoGrow();
  elInput.focus();
}

init();
