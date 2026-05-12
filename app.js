/* =========================================================
   Student AI Chatbot - app.js
   Features: multi-model chat via Puter.js, streaming, study
   modes, voice input (Web Speech API), text-to-speech,
   image upload (vision models), KaTeX math, chat export.
   ========================================================= */

// ---------- System prompts per study mode ----------
const SYSTEM_PROMPTS = {
  tutor:
    "You are a patient, friendly student tutor. Explain concepts step by step, " +
    "use simple language, give short examples, and check understanding. Use " +
    "markdown with headings, lists, and code blocks when helpful. For math, use " +
    "LaTeX inside $...$ or $$...$$.",
  homework:
    "You are a homework helper. Guide the student through problems step by step " +
    "instead of just giving answers. Ask what they've tried, point out mistakes " +
    "gently, and encourage learning. Use markdown. For math, use LaTeX inside " +
    "$...$ or $$...$$.",
  writer:
    "You are a writing and essay coach. Help the student brainstorm, outline, " +
    "improve grammar, and strengthen arguments. Give constructive feedback and " +
    "suggest improvements. Use markdown.",
  math:
    "You are a math and science tutor. Show all steps clearly, always use LaTeX " +
    "math with $...$ for inline and $$...$$ for display math, and explain the " +
    "reasoning behind each step. Use markdown.",
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

// Models known to accept image input through Puter.js
const VISION_MODELS = new Set([
  "gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini",
  "claude-sonnet-4-5", "claude-opus-4", "claude-3-7-sonnet",
  "google/gemini-2.5-pro", "google/gemini-2.5-flash",
]);

// ---------- Storage keys ----------
const STORAGE_KEY = "student_ai_chats_v2";
const THEME_KEY   = "student_ai_theme";
const TTS_KEY     = "student_ai_tts";
const AUTOSEND_VOICE_KEY = "student_ai_autosend_voice";

// ---------- State ----------
let chats = loadChats();          // { [id]: { id, title, messages:[...], model, mode, updatedAt } }
let currentChatId = null;
let isSending = false;
let attachedImages = [];          // [{ dataUrl, name }]
let recognition = null;           // SpeechRecognition instance
let isRecording = false;
let voiceInterimStart = 0;        // length of input text before this recording started

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const elMessages     = $("messages");
const elForm         = $("inputForm");
const elInput        = $("userInput");
const elSendBtn      = $("sendBtn");
const elModel        = $("modelSelect");
const elMode         = $("modeSelect");
const elNewChat      = $("newChatBtn");
const elChatList     = $("chatList");
const elClearAll     = $("clearAllBtn");
const elExport       = $("exportBtn");
const elChatTitle    = $("chatTitle");
const elToggleSide   = $("toggleSidebar");
const elSidebar      = $("sidebar");
const elThemeBtn     = $("themeBtn");
const elTtsToggle    = $("ttsToggle");
const elAutoSendVoice= $("autoSendVoice");
const elAttachBtn    = $("attachBtn");
const elFileInput    = $("fileInput");
const elMicBtn       = $("micBtn");
const elStopSpeakBtn = $("stopSpeakBtn");
const elAttached     = $("attachedImages");

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

function renderMathIn(el) {
  if (typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true  },
        { left: "\\[", right: "\\]", display: true },
        { left: "$",  right: "$",  display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  } catch (e) {
    console.warn("KaTeX render failed:", e);
  }
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
  if (theme === "light") document.body.setAttribute("data-theme", "light");
  else document.body.removeAttribute("data-theme");
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
    if (remaining.length) currentChatId = remaining[0];
    else { createNewChat(); return; }
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
  clearAttachments();
  renderChatList();
  renderMessages();
  if (window.innerWidth <= 820) elSidebar.classList.remove("open");
}

function getCurrentChat() {
  if (!currentChatId || !chats[currentChatId]) {
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
    const text = typeof firstUser.content === "string"
      ? firstUser.content
      : (firstUser.text || "Image question");
    chat.title = text.slice(0, 40).replace(/\s+/g, " ").trim() || "New Chat";
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

  if (!chat.messages.length) { renderWelcome(); return; }

  for (const msg of chat.messages) appendMessageEl(msg);
  scrollToBottom();
}

function renderWelcome() {
  elMessages.innerHTML = `
    <div class="welcome">
      <h2>Hi! I'm your Student AI Assistant</h2>
      <p>Ask me anything &mdash; homework, essays, math, coding, science, or study tips. You can type, speak, or attach an image.</p>
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

function appendMessageEl(msg) {
  const role = msg.role;
  const wrap = document.createElement("div");
  wrap.className = "message " + (role === "user" ? "user" : "bot");
  wrap.innerHTML = `
    <div class="avatar">${role === "user" ? "You" : "AI"}</div>
    <div class="bubble"></div>
  `;
  const bubble = wrap.querySelector(".bubble");

  // Render images first (if any)
  if (Array.isArray(msg.images) && msg.images.length) {
    const imgRow = document.createElement("div");
    imgRow.className = "msg-images";
    for (const src of msg.images) {
      const img = document.createElement("img");
      img.src = src;
      imgRow.appendChild(img);
    }
    bubble.appendChild(imgRow);
  }

  // Render text
  const textNode = document.createElement("div");
  textNode.className = "text";
  if (role === "assistant" || role === "bot") {
    textNode.innerHTML = renderMarkdown(getMsgText(msg));
  } else {
    textNode.textContent = getMsgText(msg);
  }
  bubble.appendChild(textNode);

  // Post-process bot messages: code highlight + math + actions
  if (role === "assistant" || role === "bot") {
    textNode.querySelectorAll("pre code").forEach((b) => hljs.highlightElement(b));
    renderMathIn(textNode);

    const actions = document.createElement("div");
    actions.className = "bubble-actions";
    actions.innerHTML = `
      <button class="act-copy" title="Copy text">Copy</button>
      <button class="act-speak" title="Read aloud">Speak</button>
    `;
    actions.querySelector(".act-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(getMsgText(msg));
    });
    actions.querySelector(".act-speak").addEventListener("click", () => {
      speak(getMsgText(msg));
    });
    bubble.appendChild(actions);
  }

  elMessages.appendChild(wrap);
  return { wrap, bubble, textNode };
}

function getMsgText(msg) {
  if (typeof msg.content === "string") return msg.content;
  if (typeof msg.text === "string") return msg.text;
  return "";
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

// ---------- Building the model payload ----------
function buildMessagesForModel(chat) {
  const system = SYSTEM_PROMPTS[chat.mode] || SYSTEM_PROMPTS.tutor;

  const history = chat.messages.map((m) => {
    // User message with images -> multipart content (vision format)
    if (m.role === "user" && Array.isArray(m.images) && m.images.length) {
      const parts = [];
      if (m.text) parts.push({ type: "text", text: m.text });
      for (const src of m.images) {
        parts.push({ type: "image_url", image_url: { url: src } });
      }
      return { role: "user", content: parts };
    }
    return { role: m.role, content: getMsgText(m) };
  });

  return [{ role: "system", content: system }, ...history];
}

// ---------- Sending ----------
async function sendMessage(userText) {
  const hasImages = attachedImages.length > 0;
  if ((!userText && !hasImages) || isSending) return;

  if (typeof puter === "undefined" || !puter?.ai?.chat) {
    alert("Puter.js failed to load. Check your internet connection and refresh.");
    return;
  }

  const chat = getCurrentChat();
  chat.model = elModel.value;
  chat.mode  = elMode.value;

  // Warn if user attached images but picked a non-vision model
  if (hasImages && !VISION_MODELS.has(chat.model)) {
    const ok = confirm(
      "The selected model may not support images. Switch to GPT-4o now?"
    );
    if (ok) {
      elModel.value = "gpt-4o";
      chat.model = "gpt-4o";
    }
  }

  const userMsg = {
    role: "user",
    text: userText || (hasImages ? "(image attached)" : ""),
    content: userText || "",
    images: attachedImages.map((a) => a.dataUrl),
  };
  chat.messages.push(userMsg);
  updateChatTitleFromFirstMessage(chat);
  chat.updatedAt = Date.now();
  saveChats();

  // Swap welcome -> messages
  if (elMessages.querySelector(".welcome")) elMessages.innerHTML = "";

  appendMessageEl(userMsg);
  clearAttachments();
  renderChatList();
  scrollToBottom();

  const typingEl = appendTyping();
  setSending(true);

  let assistantText = "";
  try {
    const messages = buildMessagesForModel(chat);
    const response = await puter.ai.chat(messages, {
      model: chat.model,
      stream: true,
    });

    let bubbleRefs = null;
    const ensureBubble = () => {
      if (bubbleRefs) return bubbleRefs;
      typingEl.remove();
      bubbleRefs = appendMessageEl({ role: "assistant", content: "" });
      return bubbleRefs;
    };

    for await (const part of response) {
      const chunk =
        (part && typeof part === "object" && "text" in part && part.text) ||
        (typeof part === "string" ? part : "");
      if (!chunk) continue;
      assistantText += chunk;
      const { textNode } = ensureBubble();
      textNode.innerHTML = renderMarkdown(assistantText);
      scrollToBottom();
    }

    if (bubbleRefs) {
      const { textNode } = bubbleRefs;
      textNode.querySelectorAll("pre code").forEach((el) => hljs.highlightElement(el));
      renderMathIn(textNode);
    } else {
      typingEl.remove();
      const fallback = "_(No response received. Try again or switch models.)_";
      appendMessageEl({ role: "assistant", content: fallback });
      assistantText = fallback;
    }
  } catch (err) {
    console.error(err);
    typingEl.remove();
    const msg =
      "**Oops — something went wrong.**\n\n" +
      "```\n" + (err?.message || String(err)) + "\n```\n\n" +
      "Tips:\n" +
      "- Check your internet connection\n" +
      "- Try a different model from the sidebar\n" +
      "- If prompted, sign in to Puter (free) to continue";
    appendMessageEl({ role: "assistant", content: msg });
    assistantText = msg;
  } finally {
    setSending(false);
  }

  if (assistantText) {
    chat.messages.push({ role: "assistant", content: assistantText });
    chat.updatedAt = Date.now();
    saveChats();
    renderChatList();

    if (elTtsToggle.checked) speak(assistantText);
  }
}

function setSending(sending) {
  isSending = sending;
  elSendBtn.disabled = sending;
  elInput.disabled = sending;
}

// ---------- Attachments (images) ----------
function clearAttachments() {
  attachedImages = [];
  renderAttachments();
}
function renderAttachments() {
  elAttached.innerHTML = "";
  if (!attachedImages.length) { elAttached.hidden = true; return; }
  elAttached.hidden = false;
  attachedImages.forEach((a, idx) => {
    const el = document.createElement("div");
    el.className = "thumb";
    el.innerHTML = `<img alt="${a.name || 'image'}" /><button type="button" class="rm" title="Remove">&times;</button>`;
    el.querySelector("img").src = a.dataUrl;
    el.querySelector(".rm").addEventListener("click", () => {
      attachedImages.splice(idx, 1);
      renderAttachments();
    });
    elAttached.appendChild(el);
  });
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
elAttachBtn.addEventListener("click", () => elFileInput.click());
elFileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    if (f.size > 8 * 1024 * 1024) { // 8 MB guard
      alert(`"${f.name}" is larger than 8MB and was skipped.`);
      continue;
    }
    try {
      const dataUrl = await readFileAsDataURL(f);
      attachedImages.push({ dataUrl, name: f.name });
    } catch (err) { console.error(err); }
  }
  elFileInput.value = "";
  renderAttachments();
});
// Drag-and-drop onto the input area
elForm.addEventListener("dragover", (e) => { e.preventDefault(); });
elForm.addEventListener("drop", async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files || []);
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const dataUrl = await readFileAsDataURL(f);
      attachedImages.push({ dataUrl, name: f.name });
    } catch {}
  }
  renderAttachments();
});
// Paste images from clipboard
elInput.addEventListener("paste", async (e) => {
  const items = Array.from(e.clipboardData?.items || []);
  for (const it of items) {
    if (it.kind === "file" && it.type.startsWith("image/")) {
      const file = it.getAsFile();
      if (file) {
        const dataUrl = await readFileAsDataURL(file);
        attachedImages.push({ dataUrl, name: file.name || "pasted.png" });
        renderAttachments();
      }
    }
  }
});

// ---------- Voice input (Web Speech API) ----------
function setupSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    elMicBtn.title = "Voice input not supported in this browser";
    elMicBtn.disabled = true;
    elMicBtn.style.opacity = 0.4;
    return;
  }
  recognition = new SR();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    elMicBtn.classList.add("recording");
    voiceInterimStart = elInput.value.length + (elInput.value.length ? 1 : 0);
    if (elInput.value && !elInput.value.endsWith(" ")) elInput.value += " ";
  };
  recognition.onerror = (e) => {
    console.warn("Speech error:", e.error);
    stopRecording();
  };
  recognition.onend = () => {
    stopRecording();
    if (elAutoSendVoice.checked && elInput.value.trim()) {
      elForm.requestSubmit();
    }
  };
  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interimText += res[0].transcript;
    }
    const base = elInput.value.slice(0, voiceInterimStart);
    elInput.value = base + (finalText || interimText);
    autoGrow();
  };
}
function startRecording() {
  if (!recognition) setupSpeechRecognition();
  if (!recognition) return;
  try { recognition.start(); } catch (e) { console.warn(e); }
}
function stopRecording() {
  isRecording = false;
  elMicBtn.classList.remove("recording");
  try { recognition && recognition.stop(); } catch {}
}
elMicBtn.addEventListener("click", () => {
  if (isRecording) stopRecording();
  else startRecording();
});

// ---------- Text-to-speech ----------
function stripMarkdownForSpeech(s) {
  return String(s)
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, " math ")
    .replace(/\$[^$]*\$/g, " math ")
    .replace(/\s+/g, " ")
    .trim();
}
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    u.rate = 1.0; u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => /en(-|_)/.test(v.lang) && /natural|neural|google|samantha|aria/i.test(v.name)
    );
    if (preferred) u.voice = preferred;
    u.onstart = () => { elStopSpeakBtn.hidden = false; };
    u.onend   = () => { elStopSpeakBtn.hidden = true; };
    u.onerror = () => { elStopSpeakBtn.hidden = true; };
    window.speechSynthesis.speak(u);
  } catch (e) { console.warn(e); }
}
elStopSpeakBtn.addEventListener("click", () => {
  try { window.speechSynthesis.cancel(); } catch {}
  elStopSpeakBtn.hidden = true;
});

// Restore toggles
elTtsToggle.checked = localStorage.getItem(TTS_KEY) === "1";
elAutoSendVoice.checked = localStorage.getItem(AUTOSEND_VOICE_KEY) !== "0";
elTtsToggle.addEventListener("change", () => {
  localStorage.setItem(TTS_KEY, elTtsToggle.checked ? "1" : "0");
  if (!elTtsToggle.checked) window.speechSynthesis?.cancel?.();
});
elAutoSendVoice.addEventListener("change", () => {
  localStorage.setItem(AUTOSEND_VOICE_KEY, elAutoSendVoice.checked ? "1" : "0");
});

// ---------- Export chat as Markdown ----------
function exportCurrentChat() {
  const chat = getCurrentChat();
  if (!chat.messages.length) { alert("This chat is empty."); return; }
  const title = chat.title || "Chat";
  const when = new Date().toLocaleString();
  const lines = [
    `# ${title}`,
    ``,
    `*Exported: ${when}*`,
    `*Model: ${chat.model} · Mode: ${chat.mode}*`,
    ``,
    `---`,
    ``,
  ];
  for (const m of chat.messages) {
    const who = m.role === "user" ? "**You**" : "**AI**";
    lines.push(who);
    lines.push("");
    if (Array.isArray(m.images) && m.images.length) {
      for (const src of m.images) lines.push(`![image](${src})`);
      lines.push("");
    }
    lines.push(getMsgText(m));
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = (title || "chat").replace(/[^a-z0-9-_ ]+/gi, "").slice(0, 60).trim() || "chat";
  a.href = url;
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
elExport.addEventListener("click", exportCurrentChat);

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
  if (!text && !attachedImages.length) return;
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
  // Migrate from v1 storage if present
  try {
    const oldRaw = localStorage.getItem("student_ai_chats_v1");
    if (oldRaw && !Object.keys(chats).length) {
      const old = JSON.parse(oldRaw);
      for (const id in old) {
        const c = old[id];
        c.messages = (c.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          text: typeof m.content === "string" ? m.content : "",
          images: [],
        }));
        chats[id] = c;
      }
      saveChats();
    }
  } catch {}

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
  renderAttachments();
  setupSpeechRecognition();
  autoGrow();
  elInput.focus();

  // Warm up speechSynthesis voice list in some browsers
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
}

init();
