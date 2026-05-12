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

### Run locally with Node

```bash
npm install
npm start
# open http://localhost:3000
```

Requires Node 18+.

### Deploy to Render (free Web Service)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kingtechnopoga-netizen/Proje)

This repo is fully automated:

- A `render.yaml` blueprint so Render configures itself (Node, free plan, health check).
- `autoDeploy: true` — every `git push` to `main` redeploys automatically.
- A GitHub Actions workflow that pings `/healthz` every 10 minutes so the
  free instance never sleeps.
- An optional GitHub Actions workflow that can trigger a Render deploy via
  deploy hook (backup path-scoped deploys).

Click the button above, or see [DEPLOY.md](DEPLOY.md) for the step-by-step
walkthrough and automation setup.

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
