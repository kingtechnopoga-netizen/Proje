# Student AI Chatbot

A free, keyless AI chatbot for students — built as a single-page web app.

Powered by [Puter.js](https://developer.puter.com/), which provides free access
to the latest LLMs (GPT-5, GPT-4o, Claude, Gemini, DeepSeek, Llama, …) **without
any API key**. The user signs in to Puter (free account) and Puter covers the
model costs.

## Features

- Chat with many of the latest models — pick from a dropdown
- **Study Modes**: Tutor, Homework Helper, Essay Coach, Math/Science, Coding,
  Quiz Me, Summarize & Notes, Free Chat
- Markdown rendering with syntax-highlighted code blocks
- Streaming responses (text appears as it's generated)
- Multiple chats stored in your browser (`localStorage`)
- Light / Dark theme toggle
- Fully responsive (mobile-friendly)
- **No build step, no server, no API keys**

## Quick Start

Just open `index.html` in any modern browser.

### Option A — Double-click
On most systems you can just double-click `index.html`. Some browsers restrict
local-file features, so if that doesn't work, use Option B.

### Option B — Simple local server
```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```
or with Node:
```bash
npx serve .
```

### Option C — GitHub Pages
Push to a GitHub repo and enable Pages (Settings → Pages → Deploy from branch).

## How it works

- `index.html` — page layout, loads Puter.js + marked + DOMPurify + highlight.js
- `style.css` — dark/light UI styles
- `app.js` — chat logic, model/mode selection, streaming, localStorage

The core API call (inside `app.js`) looks like:
```js
const response = await puter.ai.chat(messages, {
  model: "gpt-4o",
  stream: true,
});
for await (const part of response) { /* render part.text */ }
```

First time you send a message, Puter may prompt you to sign in (free). After
that it just works.

## Available Models

The dropdown includes (non-exhaustive):

- **OpenAI**: GPT-5, GPT-5 Mini, GPT-4o, GPT-4o Mini, o1, o3-mini
- **Anthropic**: Claude Sonnet 4.5, Claude Opus 4, Claude 3.7 Sonnet
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash
- **DeepSeek**: DeepSeek V3, DeepSeek R1
- **Meta**: Llama 3.3 70B

If a particular model is unavailable at some time, just pick another from the
dropdown — nothing else needs to change.

## Privacy

- Chats are stored **only in your browser** (`localStorage`).
- "Clear All" in the sidebar deletes everything.
- Messages are sent to the model provider through Puter.js to generate replies.

## License

MIT — do whatever you like with it.
