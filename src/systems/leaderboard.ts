import { load, save } from './persistence';

/**
 * Leaderboard client. Talks to server/leaderboard.mjs (same origin by default, or VITE_LEADERBOARD_URL
 * when the game is hosted separately). If the server can't be reached, scores are kept in a
 * per-device top 10 so the game still works offline — the UI says which board is shown.
 */
export interface LbEntry {
  rank: number;
  name: string;
  score: number;
  distance: number;
  env: string;
  gatesCorrect: number;
  at: string;
}

export interface Board {
  entries: LbEntry[];
  online: boolean;
}

export interface SubmitResult extends Board {
  rank: number | null;
  best: number;
  error?: string;
}

const BASE = ((import.meta.env.VITE_LEADERBOARD_URL as string | undefined) ?? '').replace(/\/$/, '');
const TOP = 10;
const WRITE_TIMEOUT = 20_000;
const LOCAL_KEY = 'leaderboard-local';

type LocalEntry = Omit<LbEntry, 'rank'> & { key: string };

function localAll(): LocalEntry[] {
  const v = load<LocalEntry[]>(LOCAL_KEY, []);
  return Array.isArray(v) ? v : [];
}

function localTop(all = localAll()): LbEntry[] {
  return [...all].sort((a, b) => b.score - a.score || a.at.localeCompare(b.at)).slice(0, TOP).map((e, i) => ({ ...e, rank: i + 1 }));
}

async function request(path: string, init?: RequestInit, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchBoard(): Promise<Board> {
  try {
    const res = await request('/api/leaderboard');
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { entries: LbEntry[] };
    return { entries: data.entries ?? [], online: true };
  } catch {
    return { entries: localTop(), online: false };
  }
}

/** Mirrors the server's nickname rule so players get instant feedback. */
export function validNickname(name: string): string | null {
  const s = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (s.length < 1 || s.length > 16) return null;
  return /^[\p{L}\p{N} ._-]+$/u.test(s) ? s : null;
}

export function qualifies(score: number, entries: LbEntry[]) {
  return score > 0 && (entries.length < TOP || score > entries[entries.length - 1].score);
}

export async function submitScore(run: { name: string; score: number; distance: number; env: string; gatesCorrect: number }): Promise<SubmitResult> {
  const name = validNickname(run.name);
  if (!name) return { entries: [], online: false, rank: null, best: run.score, error: 'Use 1–16 letters, numbers, spaces, dots, dashes or underscores.' };
  try {
    // writes can queue behind other players' saves on the hosted board, so allow longer than reads
    const res = await request('/api/scores', { method: 'POST', body: JSON.stringify({ ...run, name }) }, WRITE_TIMEOUT);
    if (res.status >= 500) throw new Error('server error');
    const data = await res.json();
    if (!res.ok) return { entries: [], online: true, rank: null, best: run.score, error: data.error ?? 'Could not save score.' };
    return { entries: data.entries, online: true, rank: data.rank, best: data.best };
  } catch {
    // offline: keep the best score per nickname on this device
    const all = localAll();
    const key = name.toLocaleLowerCase();
    const at = new Date().toISOString();
    const existing = all.find((e) => e.key === key);
    if (!existing) all.push({ key, name, score: run.score, distance: run.distance, env: run.env, gatesCorrect: run.gatesCorrect, at });
    else if (run.score > existing.score) Object.assign(existing, { name, score: run.score, distance: run.distance, env: run.env, gatesCorrect: run.gatesCorrect, at });
    all.sort((a, b) => b.score - a.score);
    save(LOCAL_KEY, all.slice(0, 100));
    const entries = localTop(all);
    const idx = entries.findIndex((e) => e.name.toLocaleLowerCase() === key);
    return { entries, online: false, rank: idx >= 0 ? idx + 1 : null, best: existing ? Math.max(existing.score, run.score) : run.score };
  }
}

export async function resetBoard(adminToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await request('/api/leaderboard', { method: 'DELETE', headers: { authorization: `Bearer ${adminToken}` } }, WRITE_TIMEOUT);
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? `Reset failed (${res.status}).` };
  } catch {
    return { ok: false, error: 'Leaderboard server not reachable.' };
  }
}

export function clearLocalBoard() {
  save(LOCAL_KEY, []);
}

/** Admin: remove one participant (shared board, or this device's board when offline). */
export async function removeEntry(name: string, adminToken: string): Promise<{ ok: boolean; entries: LbEntry[]; online: boolean; error?: string }> {
  try {
    const res = await request(`/api/scores?name=${encodeURIComponent(name)}`, { method: 'DELETE', headers: { authorization: `Bearer ${adminToken}` } }, WRITE_TIMEOUT);
    if (res.status >= 500) throw new Error('server error');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, entries: [], online: true, error: data.error ?? `Remove failed (${res.status}).` };
    return { ok: true, entries: data.entries ?? [], online: true };
  } catch {
    const key = name.toLocaleLowerCase();
    const all = localAll().filter((e) => e.key !== key);
    save(LOCAL_KEY, all);
    return { ok: true, entries: localTop(all), online: false };
  }
}

// ------------------------------------------------------------------ automatic submission with caching
/**
 * Avoids a request on every death. The client remembers the board's top-10 cut-off and the player's
 * best score; a run is only sent when it could change the board:
 *  - score must beat the player's own best (sent or not), and
 *  - when the board is full, score must beat the cached 10th-place score.
 * Anything else is kept locally ("cached") and the next run is only sent if it beats it.
 * Cached values expire after CACHE_TTL so a reset or newly crowded board is picked up again.
 */
interface LbCache {
  name: string; // lower-cased nickname the cache belongs to
  cutoff: number; // 10th-place score when the board is full
  full: boolean;
  myBest: number; // player's best as stored on the server
  localBest: number; // best score this device has seen for the player (sent or skipped)
  at: number; // when cutoff/myBest were last confirmed by the server
}
const CACHE_KEY = 'leaderboard-cache';
const CACHE_TTL = 10 * 60 * 1000;

function readCache(name: string): LbCache {
  const key = name.toLocaleLowerCase();
  const c = load<LbCache | null>(CACHE_KEY, null);
  if (c && c.name === key) return c;
  return { name: key, cutoff: 0, full: false, myBest: 0, localBest: 0, at: 0 };
}

function boardFacts(entries: LbEntry[]) {
  const full = entries.length >= TOP;
  return { full, cutoff: full ? entries[entries.length - 1].score : 0 };
}

/** Called when the leaderboard is viewed, so the cut-off stays fresh without extra requests. */
export function rememberBoard(name: string, entries: LbEntry[]) {
  if (!name) return;
  const c = readCache(name);
  const mine = entries.find((e) => e.name.toLocaleLowerCase() === c.name);
  save(CACHE_KEY, { ...c, ...boardFacts(entries), myBest: mine ? mine.score : c.myBest, at: Date.now() });
}

export type AutoResult =
  | { status: 'sent'; online: boolean; rank: number | null; best: number; cutoff: number; full: boolean; entries: LbEntry[] }
  | { status: 'skipped'; reason: 'personal' | 'cutoff'; best: number; cutoff: number }
  | { status: 'error'; error: string };

export async function autoSubmit(run: { name: string; score: number; distance: number; env: string; gatesCorrect: number }): Promise<AutoResult> {
  const c = readCache(run.name);
  const fresh = Date.now() - c.at < CACHE_TTL;
  const personal = Math.max(c.myBest, c.localBest);
  if (fresh && run.score <= personal) {
    return { status: 'skipped', reason: 'personal', best: personal, cutoff: c.cutoff };
  }
  if (fresh && c.full && run.score <= c.cutoff) {
    save(CACHE_KEY, { ...c, localBest: Math.max(c.localBest, run.score) });
    return { status: 'skipped', reason: 'cutoff', best: Math.max(personal, run.score), cutoff: c.cutoff };
  }
  const r = await submitScore(run);
  if (r.error) return { status: 'error', error: r.error };
  const facts = boardFacts(r.entries);
  save(CACHE_KEY, { ...c, ...facts, myBest: r.best, localBest: Math.max(c.localBest, run.score), at: Date.now() });
  return { status: 'sent', online: r.online, rank: r.rank, best: r.best, cutoff: facts.cutoff, full: facts.full, entries: r.entries };
}
