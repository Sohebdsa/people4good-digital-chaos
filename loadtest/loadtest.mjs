#!/usr/bin/env node
/**
 * Load test for the hosted Digital Chaos game.
 *
 *   node loadtest/loadtest.mjs --users 50 [--url https://...] [--rounds 2] [--play 15-45]
 *
 * Each virtual player does what a real one does against the server:
 *   1. Page load   – index.html, the JS/CSS it references, sprite atlases + a background.
 *   2. Play rounds – GET /api/leaderboard (menu), "plays" for a random time,
 *                    POST /api/scores (game over), GET /api/leaderboard (results screen).
 *   3. Spike       – every player submits at the same instant (worst case: a facilitator
 *                    says "stop, everyone submit now").
 *
 * The game itself runs in the browser, so the server only sees these requests.
 * Test nicknames start with "LT" so they are easy to spot and clear afterwards.
 * The thresholds mirror the client: reads give up after 4 s, writes after 20 s
 * (after that the player sees the offline/local board instead).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const URL_BASE = (args.url ?? 'https://people4good-digital-chaos.vercel.app').replace(/\/$/, '');
const USERS = Number(args.users ?? 50);
const ROUNDS = Number(args.rounds ?? 2);
const [PLAY_MIN, PLAY_MAX] = (args.play ?? '15-45').split('-').map(Number);
const RAMP_MS = Number(args.ramp ?? 5000);
const TAG = args.tag ?? `LT${USERS}`;
const READ_TIMEOUT = 4000;
const WRITE_TIMEOUT = 20000;
const HARD_TIMEOUT = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

/** @type {{phase:string, kind:string, status:number, ms:number, bytes:number, err?:string, user:number, t:number}[]} */
const samples = [];
const t0 = Date.now();

async function hit(phase, kind, user, path, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HARD_TIMEOUT);
  const start = performance.now();
  let status = 0, bytes = 0, err, body;
  try {
    const res = await fetch(path.startsWith('http') ? path : URL_BASE + path, { ...init, signal: ctrl.signal });
    status = res.status;
    const buf = Buffer.from(await res.arrayBuffer());
    bytes = buf.length;
    if ((res.headers.get('content-type') ?? '').includes('json')) {
      try { body = JSON.parse(buf.toString()); } catch {}
    } else if (kind === 'html') body = buf.toString();
  } catch (e) {
    err = e.name === 'AbortError' ? 'timeout' : (e.cause?.code ?? e.message);
  } finally {
    clearTimeout(timer);
  }
  const ms = performance.now() - start;
  samples.push({ phase, kind, status, ms, bytes, err, user, t: Date.now() - t0, retryAfter: undefined });
  return { status, ms, body, err };
}

// ------------------------------------------------------------------ asset list (same for every player)
async function discoverAssets() {
  const html = await (await fetch(URL_BASE + '/')).text();
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  const sprites = [
    '/assets/sprites/manifest.json',
    ...['character-front', 'character-side', 'items', 'obstacles', 'scenery'].flatMap((n) => [`/assets/sprites/atlas/${n}.json`, `/assets/sprites/atlas/${n}.png`]),
  ];
  return [...new Set(refs), ...sprites];
}
const BACKGROUNDS = ['ai', 'city', 'maze', 'security', 'sheets'];

async function pageLoad(user, assets) {
  const start = performance.now();
  const r = await hit('pageload', 'html', user, '/');
  // browsers fetch ~6 at a time per origin over h1, many more over h2; use 6 to stay realistic
  const queue = [...assets, `/assets/sprites/backgrounds/${BACKGROUNDS[user % 5]}.png`];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) await hit('pageload', 'asset', user, queue.shift());
  }));
  samples.push({ phase: 'pageload', kind: 'full-page', status: r.status, ms: performance.now() - start, bytes: 0, user, t: Date.now() - t0 });
}

function submit(phase, user, round) {
  const distance = 100 + round * 20 + (user % 7);
  const score = 50 + round * 100 + user; // low, valid, and rising each round so every POST writes
  return hit(phase, 'POST /api/scores', user, '/api/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `${TAG}-${String(user).padStart(3, '0')}`, score, distance, env: BACKGROUNDS[user % 5], gatesCorrect: round }),
  });
}

async function player(user, assets) {
  await sleep(rand(0, RAMP_MS));
  await pageLoad(user, assets);
  for (let round = 1; round <= ROUNDS; round++) {
    await hit('play', 'GET /api/leaderboard', user, '/api/leaderboard');
    await sleep(rand(PLAY_MIN, PLAY_MAX) * 1000);
    await submit('play', user, round);
    await hit('play', 'GET /api/leaderboard', user, '/api/leaderboard');
  }
}

// ------------------------------------------------------------------ stats
const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);
function summarise(rows) {
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const codes = {};
  for (const r of rows) {
    const k = r.err ? `ERR:${r.err}` : String(r.status);
    codes[k] = (codes[k] ?? 0) + 1;
  }
  const isWrite = rows[0]?.kind.startsWith('POST');
  const limit = isWrite ? WRITE_TIMEOUT : READ_TIMEOUT;
  const ok = rows.filter((r) => !r.err && r.status >= 200 && r.status < 400).length;
  return {
    count: rows.length,
    ok,
    okPct: +((ok / rows.length) * 100).toFixed(1),
    codes,
    p50: Math.round(pct(ms, 50)),
    p90: Math.round(pct(ms, 90)),
    p95: Math.round(pct(ms, 95)),
    p99: Math.round(pct(ms, 99)),
    max: Math.round(ms.at(-1) ?? 0),
    overClientTimeout: rows.filter((r) => r.ms > limit).length,
    mb: +(rows.reduce((s, r) => s + r.bytes, 0) / 1e6).toFixed(1),
  };
}

async function main() {
  console.log(`Target ${URL_BASE} | users=${USERS} rounds=${ROUNDS} play=${PLAY_MIN}-${PLAY_MAX}s tag=${TAG}`);
  const health = await hit('pre', 'GET /api/health', -1, '/api/health');
  console.log('health:', health.status, JSON.stringify(health.body));
  const assets = await discoverAssets();
  console.log(`page assets per player: ${assets.length + 2}`);

  const startPlay = Date.now();
  await Promise.all(Array.from({ length: USERS }, (_, i) => player(i, assets)));
  const playSecs = (Date.now() - startPlay) / 1000;
  console.log(`page load + play phase done in ${playSecs.toFixed(0)}s`);

  // everyone finishes at the same moment
  await sleep(3000);
  const spikeStart = performance.now();
  await Promise.all(Array.from({ length: USERS }, (_, i) => submit('spike', i, ROUNDS + 1)));
  const spikeWall = performance.now() - spikeStart;
  await Promise.all(Array.from({ length: USERS }, (_, i) => hit('spike', 'GET /api/leaderboard', i, '/api/leaderboard')));
  console.log(`spike: ${USERS} simultaneous submits finished in ${(spikeWall / 1000).toFixed(1)}s`);

  const final = await hit('post', 'GET /api/leaderboard', -1, '/api/leaderboard');
  const groups = {};
  for (const s of samples.filter((s) => s.user >= 0)) (groups[`${s.phase} | ${s.kind}`] ??= []).push(s);
  const result = {
    target: URL_BASE,
    users: USERS,
    rounds: ROUNDS,
    tag: TAG,
    startedAt: new Date(t0).toISOString(),
    durationSec: Math.round((Date.now() - t0) / 1000),
    spikeWallSec: +(spikeWall / 1000).toFixed(1),
    storedAfter: final.body?.total,
    groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, summarise(v)])),
    errorsSample: samples.filter((s) => s.err || s.status >= 400).slice(0, 15).map(({ phase, kind, status, err, ms, t }) => ({ phase, kind, status, err, ms: Math.round(ms), t })),
    timeline: samples.filter((s) => s.kind.startsWith('POST') || s.kind.startsWith('GET')).map(({ phase, kind, status, err, ms, t }) => [t, phase, kind, status || err, Math.round(ms)]),
  };
  console.table(Object.fromEntries(Object.entries(result.groups).map(([k, v]) => [k, { n: v.count, 'ok%': v.okPct, p50: v.p50, p95: v.p95, p99: v.p99, max: v.max, 'over-timeout': v.overClientTimeout, codes: JSON.stringify(v.codes) }])));
  console.log('leaderboard total stored after run:', result.storedAfter);
  const out = join(dirname(fileURLToPath(import.meta.url)), 'results', `${TAG}-${Date.now()}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log('saved', out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
