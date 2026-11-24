/**
 * Shared logic for the leaderboard Vercel Functions (files under api/_lib are not routes).
 * Mirrors server/leaderboard.mjs. The routes go through store.ts, which uses Upstash Redis when
 * connected; the Blob storage below (`leaderboard.json`) is the fallback when it isn't.
 *
 * Concurrency: every write uses the blob's ETag (`ifMatch`), so two players saving at the
 * same moment can't overwrite each other — the loser re-reads and retries.
 */
import { get, put, BlobPreconditionFailedError, BlobError } from '@vercel/blob';

export interface Entry {
  name: string;
  key: string;
  score: number;
  distance: number;
  env: string;
  gatesCorrect: number;
  at: string;
}

const PATH = 'leaderboard/leaderboard.json';
export const TOP = 10;
const MAX_STORED = 500;
export const ENVS = new Set(['maze', 'sheets', 'security', 'ai', 'city']);

// Demo admin password, hardcoded on purpose (same as server/leaderboard.mjs). Set ADMIN_TOKEN in
// the Vercel project settings to replace it.
const DEMO_ADMIN_PASSWORD = 'p4g-admin-2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || DEMO_ADMIN_PASSWORD;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ------------------------------------------------------------------ http helpers
export function json(status: number, body?: unknown, extra: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': CORS_ORIGIN,
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

export const preflight = () => json(204);

export const isAdmin = (req: Request) => req.headers.get('authorization') === `Bearer ${ADMIN_TOKEN}`;
export const checkPassword = (password: unknown) => typeof password === 'string' && password === ADMIN_TOKEN;

export async function readJson(req: Request, limit = 4096): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > limit) throw new Error('too large');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('bad json');
  }
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
}

// ------------------------------------------------------------------ validation
export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length < 1 || s.length > 16) return null;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(s)) return null;
  return s;
}

export const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Score = distance points + pickups, each up to 10x multiplied, plus gate bonuses. */
export const plausible = (score: number, distance: number, gates: number) => score <= 1000 + distance * 120 + gates * 200;

// ------------------------------------------------------------------ rate limiting (best effort)
// Fluid compute reuses function instances, so this catches bursts; it is not a global limit.
const hits = new Map<string, number[]>();
export function limited(key: string, max = 60, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

// ------------------------------------------------------------------ storage
const sortEntries = (e: Entry[]) => e.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
export const publicTop = (entries: Entry[]) =>
  entries.slice(0, TOP).map((e, i) => ({ rank: i + 1, name: e.name, score: e.score, distance: e.distance, env: e.env, gatesCorrect: e.gatesCorrect, at: e.at }));

async function load(): Promise<{ entries: Entry[]; etag: string | null }> {
  const r = await get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { entries: [], etag: null };
  const text = await new Response(r.stream).text();
  let entries: Entry[] = [];
  try {
    const parsed = JSON.parse(text) as { entries?: Entry[] };
    entries = Array.isArray(parsed.entries) ? parsed.entries.filter((e) => e && typeof e.score === 'number' && typeof e.name === 'string') : [];
  } catch {
    entries = [];
  }
  // get() reports a weak ETag (W/"…", the response is compressed); conditional writes need the strong form
  return { entries: sortEntries(entries), etag: r.blob.etag.replace(/^W\//, '') };
}

export async function readEntries(): Promise<Entry[]> {
  return (await load()).entries;
}

/**
 * Read-modify-write with optimistic concurrency. `change` returns false when nothing needs saving.
 */
export async function mutate<T>(change: (entries: Entry[]) => { save: boolean; result: (entries: Entry[]) => T }): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const { entries, etag } = await load();
    const { save, result } = change(entries);
    if (!save) return result(entries);
    sortEntries(entries);
    if (entries.length > MAX_STORED) entries.length = MAX_STORED;
    try {
      await put(PATH, JSON.stringify({ version: 1, entries }), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      });
      return result(entries);
    } catch (e) {
      const conflict =
        e instanceof BlobPreconditionFailedError || (e instanceof BlobError && /exist/i.test(e.message) && !etag);
      if (!conflict) throw e;
      // someone else saved first: back off (grows with attempts, jittered) and retry
      await new Promise((r) => setTimeout(r, Math.min(1500, 60 * 2 ** Math.min(attempt, 5)) * (0.5 + Math.random())));
    }
  }
  throw new Error('busy');
}
