import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const JANUS_URL = process.env.JANUS_URL || "https://janus.meetrhea.com";
const FETCH_TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`API returned ${resp.status}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function proxyJanus(endpoint, params, res, fallback) {
  try {
    const url = params
      ? `${JANUS_URL}${endpoint}?${params}`
      : `${JANUS_URL}${endpoint}`;
    const data = await fetchWithTimeout(url);
    res.json(data);
  } catch (e) {
    console.error(`Janus proxy error (${endpoint}):`, e.message);
    if (fallback) {
      res.json(fallback);
    } else {
      res.status(502).json({
        error: "Upstream service unavailable",
        details: e.message,
        fallback: true
      });
    }
  }
}

app.get("/health", async (req, res) => {
  let janusOk = false;
  try {
    await fetchWithTimeout(`${JANUS_URL}/health`);
    janusOk = true;
  } catch {}

  res.json({
    status: janusOk ? "healthy" : "degraded",
    service: "devlog-viewer",
    upstream: { janus: janusOk ? "ok" : "unreachable" },
    timestamp: new Date().toISOString()
  });
});

app.get("/api/devlogs", async (req, res) => {
  const params = new URLSearchParams(req.query);
  await proxyJanus("/api/v1/devlogs", params, res, { devlogs: [], error: "Janus unavailable" });
});

app.get("/api/devlogs/search", async (req, res) => {
  const params = new URLSearchParams(req.query);
  await proxyJanus("/api/v1/devlogs/search", params, res, { devlogs: [], error: "Janus unavailable" });
});

app.get("/api/services", async (req, res) => {
  await proxyJanus("/api/v1/status/services", null, res, { services: [], error: "Janus unavailable" });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Devlog Viewer running on port ${PORT}`));
