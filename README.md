# Student AI Chatbot

A free, keyless AI chatbot built for students — single-page web app, no build
step, no backend, no API keys.

Powered by [Puter.js](https://developer.puter.com/), which provides free access
to the latest LLMs (GPT-5, GPT-4o, Claude, Gemini, DeepSeek, Llama, …). The
user signs in to Puter (free) and Puter covers the model cost.

## Features

- 🤖 **Many latest models**: GPT-5 / GPT-4o / Claude Sonnet 4.5 / Gemini 2.5 /
  DeepSeek R1 / Llama 3.3 — pick from a dropdown
- 🎓 **8 Study Modes**: Tutor, Homework Helper, Essay Coach, Math/Science,
  Coding, Quiz Me, Summarize & Notes, Free Chat
- 🖼️ **Image upload** (vision): attach, paste, or drag-drop images — works with
  GPT-4o, Claude, Gemini and other vision-capable models
- 🎙️ **Voice input**: tap the mic to speak your question (Web Speech API)
- 🔊 **Text-to-speech**: optional auto-read of AI replies, plus per-message
  "Speak" button and a "Stop speaking" toolbar button
- 🧮 **Math rendering** via KaTeX — LaTeX inside `$...$` / `$$...$$` renders
  as proper equations
- 💻 **Markdown + syntax-highlighted code** (highlight.js)
- 🌊 **Streaming responses** (text appears as it's generated)
- 💾 **Multiple chats** saved locally (`localStorage`) with titles, delete,
  export
- 📤 **Export chat** as a Markdown file
- 🌗 **Light / Dark theme**
- 📱 Fully responsive (mobile-friendly)

## Quick Start

Just open `index.html` in any modern browser.

### Option A — Simple local server (recommended)
Some browsers restrict microphone/clipboard features on `file://`. Use a server:
```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```
or with Node:
```bash
npx serve .
```

### Option B — GitHub Pages (free hosting)
1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → pick your branch, folder `/ (root)` → **Save**
3. Visit the Pages URL that appears (e.g. `https://<user>.github.io/<repo>/`)

## How it works

- `index.html` — page layout, loads Puter.js + marked + DOMPurify +
  highlight.js + KaTeX
- `style.css` — dark/light UI
- `app.js` — chat state, streaming, voice, TTS, images, KaTeX rendering, export

The core chat call looks like:
```js
const response = await puter.ai.chat(messages, {
  model: "gpt-4o",
  stream: true,
});
for await (const part of response) { /* render part.text */ }
```

Image messages use OpenAI-style multipart content:
```js
{ role: "user", content: [
  { type: "text", text: "What's in this image?" },
  { type: "image_url", image_url: { url: dataUrl } },
]}
```

First time you send a message, Puter may prompt you to sign in (free). After
that it just works.

## Browser support

| Feature        | Chrome/Edge | Safari | Firefox |
|----------------|:-----------:|:------:|:-------:|
| Chat           | ✅          | ✅     | ✅      |
| Image upload   | ✅          | ✅     | ✅      |
| Text-to-speech | ✅          | ✅     | ✅      |
| Voice input    | ✅          | ✅\*   | ⚠️      |

\* Safari: mic icon appears; you may need to grant permission per-site.
Firefox has limited Web Speech API support; the mic button will be disabled
if unsupported.

## Privacy

- Chats (including attached images as data URLs) are stored **only in your
  browser** (`localStorage`).
- "Clear All" in the sidebar deletes everything.
- Messages are sent to the model provider via Puter.js to generate replies.

## License

MIT — do whatever you like with it.
