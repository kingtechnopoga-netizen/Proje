/* =========================================================
   Student AI Chatbot - Node/Express server
   Serves the frontend and provides simple health/info routes.
   Designed to run on Render as a Web Service (free tier).
   ========================================================= */

const express = require("express");
const path = require("path");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// ---------- Middleware ----------
app.disable("x-powered-by");
app.use(compression());

// Basic security + caching headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Permissions for mic (voice input) + clipboard paste
  res.setHeader(
    "Permissions-Policy",
    "microphone=(self), clipboard-read=(self), clipboard-write=(self)"
  );
  next();
});

// ---------- Health check ----------
// Render pings this to know the service is up.
app.get("/healthz", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "student-ai-chatbot",
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// A tiny info endpoint (handy for debugging deploys)
app.get("/api/info", (req, res) => {
  res.json({
    name: "Student AI Chatbot",
    node: process.version,
    env: process.env.NODE_ENV || "development",
  });
});

// ---------- Static files ----------
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        // Never cache the entrypoint so updates appear immediately
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (/\.(?:js|css|svg|png|jpg|jpeg|webp|ico)$/i.test(filePath)) {
        // Short cache for static assets
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  })
);

// ---------- SPA fallback ----------
// Any unknown path serves index.html so deep links work.
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Student AI Chatbot listening on :${PORT}`);
});
