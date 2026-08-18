import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Backend mínimo que retiene los secretos que Angular JAMÁS debe ver:
 *   - GOOGLE_FORM_ACTION_URL (a quién le mandamos el POST del formulario)
 *   - DISCORD_WEBHOOK_URL    (a quién avisamos)
 *   - UPSTASH_REDIS_REST_TOKEN (quién puede escribir en la base de KV)
 *   - ADMIN_PASSWORD / clave de firma de la cookie de sesión
 *
 * Si alguno de estos viviera en el bundle de Angular (código que se sirve
 * tal cual al navegador de cualquier visitante), cualquiera con devtools
 * podría leerlo. Por eso existe este servidor: Angular le habla por HTTP a
 * ESTE proceso, nunca directo a Google/Discord/Upstash.
 *
 * Puesta en marcha:
 *   cd server && npm install && cp .env.example .env
 *   node index.mjs          (o `npm run dev:all` desde la raíz, junto a ng serve)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Carga liviana de .env sin dependencias: una línea KEY=VALUE por renglón.
function loadEnv(file) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2] ?? "";
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // sin .env: seguimos con lo que haya en el entorno real (Vercel/Render/etc).
  }
}
loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT ?? 8787);
const ADMIN_PASSWORD_DEFAULT = "admin123";

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Rate limiting mínimo, en memoria (igual que lib/rate-limit.ts de la v8).
// ---------------------------------------------------------------------------
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { resetAt: now + windowMs, count: 1 });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anon").toString().split(",")[0].trim();
}

// ---------------------------------------------------------------------------
// Sesión de admin: HMAC firmado, mismo mecanismo que lib/auth.ts de la v8.
// ---------------------------------------------------------------------------
const COOKIE_NAME = "mesa_admin";
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

function adminSecret() {
  const pass = process.env.ADMIN_PASSWORD;
  return !pass || pass.length < 4 ? ADMIN_PASSWORD_DEFAULT : pass;
}
function isUsingDefaultPassword() {
  const pass = process.env.ADMIN_PASSWORD;
  return !pass || pass.length < 4;
}
function sign(payload, key) {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}
function safeEqualHex(a, b) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
function buildToken() {
  const key = adminSecret();
  const exp = String(Date.now() + SESSION_MS);
  return `${exp}.${sign(exp, key)}`;
}
function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  return safeEqualHex(sig, sign(exp, adminSecret()));
}
function requireAdmin(req, res, next) {
  if (!verifyToken(req.cookies?.[COOKIE_NAME])) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  if (!rateLimit(`login:${clientIp(req)}`, 8, 5 * 60_000)) {
    return res.status(429).json({ ok: false, error: "Demasiados intentos. Esperá unos minutos." });
  }
  const { password } = req.body ?? {};
  if (typeof password !== "string") return res.status(400).json({ ok: false, error: "Datos inválidos." });

  const h = (s) => crypto.createHash("sha256").update(s).digest("hex");
  const key = adminSecret();
  const match = safeEqualHex(h(password), h(key));

  if (!match) return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });

  res.cookie(COOKIE_NAME, buildToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS,
  });
  res.json({ ok: true, usingDefaultPassword: isUsingDefaultPassword() });
});

app.post("/api/admin/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/admin/session", (req, res) => {
  res.json({ isAdmin: verifyToken(req.cookies?.[COOKIE_NAME]) });
});

// ---------------------------------------------------------------------------
// KV vía Upstash REST (o memoria del proceso si no está configurado).
// ---------------------------------------------------------------------------
const memoryStore = new Map();

async function kvGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memoryStore.get(key) ?? null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.result === "string" ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function kvSet(key, value) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  memoryStore.set(key, value); // siempre en memoria también, como cache caliente
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.result === "OK";
  } catch {
    return false;
  }
}

async function kvListPush(key, value, max = 50) {
  const list = (await kvGet(key)) ?? [];
  const next = [value, ...list].slice(0, max);
  await kvSet(key, next);
  return next;
}

function isKvConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ---------------------------------------------------------------------------
// Árbol narrativo: dataset base (JSON del repo) + overlay del Master (KV).
// ---------------------------------------------------------------------------
const treeDataPath = path.join(ROOT, "src/app/core/data/role-tree-dataset.json");
const baseTree = JSON.parse(fs.readFileSync(treeDataPath, "utf-8"));
const TREE_OVERLAY_KEY = "mesa:tree:overlay";

async function getMergedTree() {
  const overlay = (await kvGet(TREE_OVERLAY_KEY)) ?? {};
  return {
    rootNode: baseTree.root_node,
    archetypes: baseTree.archetypes,
    nodes: { ...baseTree.nodes, ...overlay },
    baseNodeIds: Object.keys(baseTree.nodes),
    overlayNodeIds: Object.keys(overlay),
    persisted: isKvConfigured(),
  };
}

app.get("/api/tree", async (_req, res) => {
  res.json(await getMergedTree());
});

app.post("/api/admin/tree", requireAdmin, async (req, res) => {
  const node = req.body;
  if (!node?.id || !node?.title || !node?.text) {
    return res.status(400).json({ error: "El nodo necesita id, título y texto." });
  }
  if (Array.isArray(node.options) && node.options.length > 15) {
    return res.status(400).json({ error: "Máximo 15 opciones por nodo." });
  }

  const overlay = (await kvGet(TREE_OVERLAY_KEY)) ?? {};
  overlay[node.id] = node;
  const persisted = await kvSet(TREE_OVERLAY_KEY, overlay);
  res.json({ ok: true, persisted });
});

app.delete("/api/admin/tree/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (baseTree.nodes[id]) {
    return res.status(400).json({ error: "Ese nodo es parte del dataset base y no se puede borrar desde acá." });
  }
  const overlay = (await kvGet(TREE_OVERLAY_KEY)) ?? {};
  delete overlay[id];
  await kvSet(TREE_OVERLAY_KEY, overlay);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Pesos del modelo de ML.
// ---------------------------------------------------------------------------
const DIMENSIONS = ["combate", "creatividad", "equipo", "ley", "riesgo", "oscuridad", "regla", "humor"];
const WEIGHTS_KEY = "mesa:ml:weights";
const FEEDBACK_KEY = "mesa:ml:feedback";

function defaultWeights() {
  return Object.fromEntries(DIMENSIONS.map((d) => [d, 1]));
}
function sanitizeWeights(raw) {
  const base = defaultWeights();
  if (!raw || typeof raw !== "object") return base;
  for (const d of DIMENSIONS) {
    const v = raw[d];
    if (typeof v === "number" && Number.isFinite(v)) base[d] = Math.min(3, Math.max(0, v));
  }
  return base;
}

app.get("/api/ml/weights", async (_req, res) => {
  const stored = await kvGet(WEIGHTS_KEY);
  res.json(stored ? sanitizeWeights(stored) : defaultWeights());
});

app.get("/api/ml/weights/history", requireAdmin, async (_req, res) => {
  res.json((await kvGet(FEEDBACK_KEY)) ?? []);
});

app.post("/api/ml/weights", requireAdmin, async (req, res) => {
  const body = req.body ?? {};

  if (body.mode === "reset") {
    const w = defaultWeights();
    await kvSet(WEIGHTS_KEY, w);
    return res.json({ ok: true, weights: w });
  }

  if (body.mode === "manual") {
    const w = sanitizeWeights(body.weights);
    const persisted = await kvSet(WEIGHTS_KEY, w);
    return res.json({ ok: true, weights: w, persisted });
  }

  if (body.mode === "correction") {
    // El CÁLCULO de la corrección (mover los pesos según qué tan lejos
    // estaba la predicción de la campaña correcta) vive en Angular
    // (MlRecommendService.learnFromFeedback) para no duplicar la tabla de
    // campañas acá — el backend recibe el resultado ya calculado en
    // `body.weights` y sólo lo persiste + registra el historial. Es el mismo
    // reparto de responsabilidades que "manual": Angular decide, el backend
    // guarda (porque sólo el backend tiene el token de escritura de Upstash).
    if (!body.predicted || !body.actual) {
      return res.status(400).json({ error: "Faltan predicted/actual." });
    }

    const next = sanitizeWeights(body.weights);
    const persisted = await kvSet(WEIGHTS_KEY, next);

    await kvListPush(
      FEEDBACK_KEY,
      { predicted: body.predicted, actual: body.actual, createdAt: new Date().toISOString() },
      50,
    );

    return res.json({ ok: true, weights: next, persisted });
  }

  res.status(400).json({ error: "mode inválido" });
});

// ---------------------------------------------------------------------------
// Google Forms + Discord — el POST de la postulación.
// ---------------------------------------------------------------------------
const ENTRY = {
  nombre: "entry.592377339",
  contacto: "entry.1145937670",
  experiencia: "entry.1662985932",
  sistema: "entry.259189639",
  tematica: "entry.1977972677",
  modalidad: "entry.2000145625",
  frecuencia: "entry.432896089",
  disponibilidad: ["entry.876431454", "entry.2140878283", "entry.2065289993"],
  lineasRojas: ["entry.36863628", "entry.28201251"],
};

function isGoogleFormsConfigured() {
  const url = process.env.GOOGLE_FORM_ACTION_URL ?? "";
  return url.startsWith("https://docs.google.com/forms/") && url.includes("/formResponse");
}

async function submitToGoogleForms(fields) {
  const actionUrl = process.env.GOOGLE_FORM_ACTION_URL;
  if (!actionUrl || !isGoogleFormsConfigured()) return false;

  const params = new URLSearchParams();
  params.append(ENTRY.nombre, fields.nombre);
  params.append(ENTRY.contacto, fields.contacto);
  params.append(ENTRY.experiencia, fields.experiencia);
  params.append(ENTRY.sistema, fields.sistema);
  params.append(ENTRY.tematica, (fields.tematicas ?? []).join(" · "));
  params.append(ENTRY.modalidad, fields.modalidad);
  params.append(ENTRY.frecuencia, fields.frecuencia);
  (fields.disponibilidad ?? []).slice(0, ENTRY.disponibilidad.length).forEach((v, i) => params.append(ENTRY.disponibilidad[i], v));
  (fields.lineasRojas ?? []).slice(0, ENTRY.lineasRojas.length).forEach((v, i) => params.append(ENTRY.lineasRojas[i], v));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(actionUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

function isWebhookConfigured() {
  const url = process.env.DISCORD_WEBHOOK_URL ?? "";
  return url.startsWith("https://discord.com/api/webhooks/") || url.startsWith("https://discordapp.com/api/webhooks/");
}

async function notifyDiscord(fields) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !isWebhookConfigured()) return false;

  const field = (name, value) => ({ name, value: (value || "—").toString().slice(0, 1024), inline: true });
  const body = {
    username: "La Mesa Perdida",
    embeds: [
      {
        title: `🎲 ${fields.nombre}`,
        color: 0xc9a227,
        fields: [
          field("Contacto", fields.contacto),
          field("Experiencia", fields.experiencia),
          field("Sistema", fields.sistema),
          field("Modalidad", fields.modalidad),
          field("Frecuencia", fields.frecuencia),
          field("Temáticas", (fields.tematicas ?? []).join(" · ")),
          field("Disponibilidad", (fields.disponibilidad ?? []).join(" · ")),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

app.post("/api/rpg-signup", async (req, res) => {
  if (!rateLimit(`signup:${clientIp(req)}`, 5, 60_000)) {
    return res.status(429).json({ ok: false, error: "Demasiados envíos seguidos." });
  }

  const data = req.body ?? {};

  if (data.website && String(data.website).trim().length > 0) return res.json({ ok: true }); // honeypot
  if (typeof data.elapsedMs === "number" && data.elapsedMs < 3000) return res.json({ ok: true });

  if (!data.nombre || !data.contacto || !data.experiencia) {
    return res.status(400).json({ ok: false, error: "Faltan campos obligatorios." });
  }

  const [formsOk, discordOk] = await Promise.all([submitToGoogleForms(data), notifyDiscord(data)]);
  const delivered = formsOk || discordOk;

  res.json({
    ok: true,
    delivered,
    channels: { googleForms: formsOk, discord: discordOk },
    configured: isGoogleFormsConfigured() || isWebhookConfigured(),
  });
});

// ---------------------------------------------------------------------------
// Bestiario: proxy cacheado de la D&D 5e API (dnd5eapi.co).
//
// Gratis, abierta, contenido del SRD 5.1 bajo licencia OGL. Va por acá y no
// directo desde Angular por dos motivos: cache en memoria de 24h (no le
// pegamos a un servicio comunitario gratis en cada carga) y whitelist de
// recursos (nadie puede usar este dominio como proxy abierto hacia
// cualquier URL de dnd5eapi.co).
// ---------------------------------------------------------------------------
const DND5E_BASE = "https://www.dnd5eapi.co/api";
const DND5E_ALLOWED = new Set(["monsters", "spells", "classes", "races", "conditions", "magic-items"]);
const DND5E_SLUG_RE = /^[a-z0-9-]{1,60}$/;
const DND5E_CACHE_MS = 24 * 60 * 60 * 1000;
const dnd5eCache = new Map(); // key -> { at, data }

app.get("/api/dnd5e", async (req, res) => {
  const resource = String(req.query.resource ?? "monsters").toLowerCase();
  const index = req.query.index ? String(req.query.index) : null;

  if (!DND5E_ALLOWED.has(resource)) {
    return res.status(400).json({ error: "Recurso no permitido.", allowed: [...DND5E_ALLOWED] });
  }
  if (index !== null && !DND5E_SLUG_RE.test(index)) {
    return res.status(400).json({ error: "Identificador inválido." });
  }

  const cacheKey = `${resource}:${index ?? ""}`;
  const cached = dnd5eCache.get(cacheKey);
  if (cached && Date.now() - cached.at < DND5E_CACHE_MS) {
    return res.json(cached.data);
  }

  const url = index ? `${DND5E_BASE}/${resource}/${index}` : `${DND5E_BASE}/${resource}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({ error: "La API de D&D 5e no respondió correctamente." });
    }

    const data = await upstream.json();
    dnd5eCache.set(cacheKey, { at: Date.now(), data });
    res.json(data);
  } catch {
    res.status(504).json({ error: "No se pudo contactar la API de D&D 5e. Probá de nuevo en un rato." });
  }
});

// ---------------------------------------------------------------------------
// En producción, este mismo proceso sirve también el build de Angular.
// ---------------------------------------------------------------------------
const distPath = path.join(ROOT, "dist/la-mesa-perdida-angular/browser");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => {
  console.log(`[server] escuchando en http://localhost:${PORT}`);
  if (isUsingDefaultPassword()) {
    console.warn("[server] ADMIN_PASSWORD no configurada — usando la clave de desarrollo pública (admin123).");
  }
});
