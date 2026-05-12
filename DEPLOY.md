# Deploying to Render (Web Service)

This project is a Node/Express app. On Render it runs as a **Web Service** on
the free plan. The included `render.yaml` blueprint does all the configuration.

## Option A — One-click Blueprint (recommended)

1. Go to **https://render.com** and sign in with GitHub.
2. Click **New +** (top right) → **Blueprint**.
3. Choose your repo `kingtechnopoga-netizen/Proje`.
4. Render detects `render.yaml` and shows a preview:
   - Service: `student-ai-chatbot`
   - Type: **Web Service**
   - Runtime: **Node**
   - Plan: **Free**
5. Click **Apply**.
6. First build takes ~1 minute. When status is **Live**, click the URL
   (looks like `https://student-ai-chatbot.onrender.com`).

Every push to the branch listed in `render.yaml` (`main` by default)
auto-deploys.

## Option B — Manual setup (no blueprint)

1. Sign in to Render with GitHub.
2. **New +** → **Web Service**.
3. Connect your repo.
4. Fill in:
   - **Name**: `student-ai-chatbot`
   - **Region**: pick the closest one
   - **Branch**: `main` (or whichever branch has your code)
   - **Runtime**: **Node**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Under **Advanced**, set:
   - **Health Check Path**: `/healthz`
   - Env var `NODE_VERSION` = `20.11.1`
6. Click **Create Web Service**.

## How it works

- `server.js` runs an Express server on `process.env.PORT` (Render provides it).
- `npm install` installs `express` + `compression`.
- `npm start` runs `node server.js`.
- The server serves `index.html`, `app.js`, `style.css` and a SPA fallback.
- `GET /healthz` returns `{ ok: true }` — Render uses this to verify the
  service is live.

## Free plan notes

Render's free Web Services **spin down after ~15 minutes of inactivity** and
take a few seconds to wake back up on the next request. That's fine for a
personal tool. If you want it to stay warm, upgrade to the **Starter** plan
($7/mo) in Render.

## Troubleshooting

| Issue | Fix |
|---|---|
| Build fails with "ENOENT: package.json" | Make sure `package.json` is in the repo root |
| "Application exited early" | Check logs; likely a missing dep. Verify `npm install` succeeded |
| Wrong branch is being deployed | Edit `render.yaml` (`branch:` key) or change it in Render → Settings |
| Health check fails | Make sure `/healthz` returns 200. It does by default |
| Site loads but mic doesn't work | Browsers require HTTPS for mic. Render gives HTTPS automatically |
| "No open ports detected" | Render expects the app on `process.env.PORT`. `server.js` already handles this |

## Custom domain

1. Service → **Settings** → **Custom Domains** → **Add**.
2. Enter your domain (e.g. `chat.example.com`).
3. Add the DNS records Render shows you.
4. HTTPS cert is issued automatically within minutes.
