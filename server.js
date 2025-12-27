import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const ARGUS_URL = process.env.ARGUS_URL || "https://argus.meetrhea.com";
const FETCH_TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`Argus returned ${resp.status}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function proxyArgus(endpoint, params, res, fallback) {
  try {
    const url = params
      ? `${ARGUS_URL}${endpoint}?${params}`
      : `${ARGUS_URL}${endpoint}`;
    const data = await fetchWithTimeout(url);
    res.json(data);
  } catch (e) {
    console.error(`Argus proxy error (${endpoint}):`, e.message);
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
  let argusOk = false;
  try {
    await fetchWithTimeout(`${ARGUS_URL}/health`);
    argusOk = true;
  } catch {}

  res.json({
    status: argusOk ? "healthy" : "degraded",
    service: "devlog-viewer",
    upstream: { argus: argusOk ? "ok" : "unreachable" },
    timestamp: new Date().toISOString()
  });
});

app.get("/api/devlogs", async (req, res) => {
  const params = new URLSearchParams(req.query);
  await proxyArgus("/api/devlogs", params, res, { devlogs: [], error: "Argus unavailable" });
});

app.get("/api/devlogs/search", async (req, res) => {
  const params = new URLSearchParams(req.query);
  await proxyArgus("/api/devlogs/search", params, res, { devlogs: [], error: "Argus unavailable" });
});

app.get("/api/services", async (req, res) => {
  await proxyArgus("/api/services", null, res, { services: [], error: "Argus unavailable" });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Devlog Viewer running on port ${PORT}`));
