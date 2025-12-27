import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const ARGUS_URL = process.env.ARGUS_URL || "https://argus.meetrhea.com";

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "devlog-viewer", timestamp: new Date().toISOString() });
});

app.get("/api/devlogs", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query);
    const resp = await fetch(ARGUS_URL + "/api/devlogs?" + params);
    res.json(await resp.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/devlogs/search", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query);
    const resp = await fetch(ARGUS_URL + "/api/devlogs/search?" + params);
    res.json(await resp.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const resp = await fetch(ARGUS_URL + "/api/services");
    res.json(await resp.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Devlog Viewer running on port ${PORT}`));
