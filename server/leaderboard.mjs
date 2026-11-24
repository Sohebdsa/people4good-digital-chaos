#!/usr/bin/env node
/**
 * PEOPLE4GOOD leaderboard service — zero dependencies (Node 18+ built-ins only).
 *
 *   GET    /api/leaderboard         -> { entries: [...top 10], total }
 *   POST   /api/scores              -> body { name, score, distance, env, gatesCorrect }
 *                                      returns { rank (1-10 or null), best, entries }
 *   POST   /api/admin/login         -> body { password } ; 200 if it is the admin password
 *   DELETE /api/leaderboard         -> reset            (header "Authorization: Bearer <admin password>")
 *   DELETE /api/scores?name=<nick>  -> remove one entry (same header)
 *   GET    /api/health              -> { ok: true }
 *
 * Each participant (nickname, case-insensitive) keeps their best score; the board shows the top 10.
 * Also serves the built game from ../dist when present, so `npm run workshop` hosts everything
 * on one port for a workshop Wi-Fi.
 *
 * Environment:
 *   PORT (8787) · HOST (0.0.0.0) · DATA_FILE (server/data/leaderboard.json)
 *   ADMIN_TOKEN (admin password; defaults to the demo password below) · CORS_ORIGIN (* by default)
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const DATA_FILE = path.resolve(process.env.DATA_FILE ?? path.join(here, 'data', 'leaderboard.json'));
// Demo admin password, hardcoded on purpose for a small workshop demo (the repo is public, so
// anyone can read it). Override for real use:  ADMIN_TOKEN=something-secret npm run workshop
const DEMO_ADMIN_PASSWORD = 'p4g-admin-2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || DEMO_ADMIN_PASSWORD;
const isAdmin = (req) => req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const DIST = path.resolve(here, '..', 'dist');
const TOP = 10;
const MAX_STORED = 500; // best score per nickname, capped
const ENVS = new Set(['maze', 'sheets', 'security', 'ai', 'city']);

// ------------------------------------------------------------------ storage
/** @type {{ name: string, key: string, score: number, distance: number, env: string, gatesCorrect: number, at: string }[]} */
let entries = [];

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(raw.entries)) entries = raw.entries.filter((e) => e && typeof e.score === 'number' && typeof e.name === 'string');
  } catch {
    entries = []; // first run or unreadable file: start empty (the bad file is left in place for inspection)
  }
  sortEntries();
}

let writing = Promise.resolve();
/** Atomic write: temp file + rename, serialised so concurrent requests never interleave. */
function persist() {
  writing = writing.then(async () => {
    await fsp.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify({ version: 1, entries }, null, 1));
    await fsp.rename(tmp, DATA_FILE);
  }).catch((e) => console.error('[leaderboard] save failed:', e.message));
  return writing;
}

function sortEntries() {
  entries.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
}

const publicEntry = (e, i) => ({ rank: i + 1, name: e.name, score: e.score, distance: e.distance, env: e.env, gatesCorrect: e.gatesCorrect, at: e.at });
const top = () => entries.slice(0, TOP).map(publicEntry);

// ------------------------------------------------------------------ validation
/** Nicknames: 1-16 visible characters; letters (any script), digits, space, . _ - */
function cleanName(v) {
  if (typeof v !== 'string') return null;
  const s = v.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length < 1 || s.length > 16) return null;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(s)) return null;
  return s;
}

const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

/**
 * Plausibility check (not anti-cheat-grade, but stops obviously forged submissions):
 * score = distance points + pickups, each multiplied by up to 10x (combo x5, AI boost x2), plus gate bonuses.
 */
function plausible(score, distance, gates) {
  return score <= 1000 + distance * 120 + gates * 200;
}

// ------------------------------------------------------------------ rate limiting
const hits = new Map(); // ip -> timestamps
// generous: a whole workshop room may share one public IP behind a router
function limited(ip, max = 60, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (list.every((t) => now - t > 60_000)) hits.delete(ip);
}, 60_000).unref();

// ------------------------------------------------------------------ http helpers
function send(res, status, body, extra = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': CORS_ORIGIN,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'x-content-type-options': 'nosniff',
    ...extra,
  });
  res.end(data);
}

function readJson(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

async function serveStatic(req, res, urlPath) {
  if (!fs.existsSync(DIST)) {
    send(res, 404, { error: 'Game build not found. Run "npm run build" (or use "npm run workshop").' });
    return;
  }
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.resolve(DIST, '.' + rel);
  if (!file.startsWith(DIST + path.sep)) return send(res, 403, { error: 'forbidden' });
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    file = path.join(DIST, 'index.html'); // single-page app fallback
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  });
  fs.createReadStream(file).pipe(res);
}

// ------------------------------------------------------------------ routes
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local');
  const ip = req.socket.remoteAddress ?? 'unknown';
  try {
    if (req.method === 'OPTIONS') return send(res, 204);

    if (url.pathname === '/api/health') return send(res, 200, { ok: true });

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      return send(res, 200, { entries: top(), total: entries.length });
    }

    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      if (limited(`login:${ip}`, 10)) return send(res, 429, { error: 'Too many attempts, wait a minute.' }, { 'retry-after': '60' });
      const body = await readJson(req);
      if (typeof body.password === 'string' && body.password === ADMIN_TOKEN) return send(res, 200, { ok: true });
      return send(res, 401, { error: 'Wrong admin password.' });
    }

    if (url.pathname === '/api/scores' && req.method === 'DELETE') {
      if (!isAdmin(req)) return send(res, 401, { error: 'unauthorised' });
      const key = (url.searchParams.get('name') ?? '').normalize('NFKC').trim().toLocaleLowerCase();
      const before = entries.length;
      entries = entries.filter((e) => e.key !== key);
      if (entries.length !== before) await persist();
      return send(res, entries.length !== before ? 200 : 404, { removed: before - entries.length, entries: top(), total: entries.length });
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'DELETE') {
      if (!isAdmin(req)) return send(res, 401, { error: 'unauthorised' });
      entries = [];
      await persist();
      return send(res, 200, { entries: [], total: 0 });
    }

    if (url.pathname === '/api/scores' && req.method === 'POST') {
      if (limited(ip)) return send(res, 429, { error: 'Too many submissions, try again in a minute.' }, { 'retry-after': '60' });
      const body = await readJson(req);
      const name = cleanName(body.name);
      const score = int(body.score, 0, 50_000_000);
      const distance = int(body.distance, 0, 1_000_000);
      const gatesCorrect = int(body.gatesCorrect ?? 0, 0, 1000);
      const env = ENVS.has(body.env) ? body.env : 'maze';
      if (!name) return send(res, 400, { error: 'Nickname must be 1-16 letters, numbers, spaces, dots, dashes or underscores.' });
      if (score === null || distance === null || gatesCorrect === null) return send(res, 400, { error: 'Invalid score data.' });
      if (!plausible(score, distance, gatesCorrect)) return send(res, 422, { error: 'Score rejected as implausible.' });

      const key = name.toLocaleLowerCase();
      const at = new Date().toISOString();
      const existing = entries.find((e) => e.key === key);
      let improved = false;
      if (!existing) {
        entries.push({ name, key, score, distance, env, gatesCorrect, at });
        improved = true;
      } else if (score > existing.score) {
        Object.assign(existing, { name, score, distance, env, gatesCorrect, at });
        improved = true;
      }
      if (improved) {
        sortEntries();
        if (entries.length > MAX_STORED) entries.length = MAX_STORED;
        await persist();
      }
      const idx = entries.findIndex((e) => e.key === key);
      const best = idx >= 0 ? entries[idx].score : score;
      return send(res, 200, { rank: idx >= 0 && idx < TOP ? idx + 1 : null, best, improved, entries: top() });
    }

    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url.pathname);
    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    const msg = String(e?.message ?? e);
    return send(res, msg === 'too large' ? 413 : msg === 'bad json' ? 400 : 500, { error: msg === 'bad json' ? 'Invalid JSON.' : 'Server error.' });
  }
});

load();
server.listen(PORT, HOST, () => {
  const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`[leaderboard] listening on http://localhost:${PORT}  (${entries.length} participants stored in ${path.relative(process.cwd(), DATA_FILE)})`);
  if (fs.existsSync(DIST)) for (const ip of lan) console.log(`[leaderboard] participants can open http://${ip}:${PORT} on the same Wi-Fi`);
  if (!process.env.ADMIN_TOKEN) console.log('[leaderboard] using the built-in DEMO admin password - set ADMIN_TOKEN for anything beyond a demo');
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => writing.finally(() => process.exit(0)));
