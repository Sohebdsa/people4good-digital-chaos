/**
 * Leaderboard storage. Uses Upstash Redis when it is connected to the project, and falls back
 * to the single Vercel Blob file (core.ts) otherwise, so deploying this before Redis exists
 * keeps the board working.
 *
 * Why Redis: the Blob board is one JSON file rewritten on every save, so only one save can
 * win at a time and a crowd submitting together queues for 20+ s (see loadtest/LOAD-TEST-REPORT.md).
 * In Redis each save is one atomic script call of a few ms, so saves never collide or retry.
 *
 * Layout:  lb:scores  sorted set  member = lowercase nickname, score = best score
 *          lb:entries hash        member -> JSON Entry (name, distance, env, gates, time)
 */
import { Redis } from '@upstash/redis';
import { mutate, publicTop, readEntries, TOP, type Entry } from './core.js';

const ZKEY = 'lb:scores';
const HKEY = 'lb:entries';
const MAX_STORED = 500;

// Vercel's Upstash integration sets KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;

export const storageKind = redis ? 'redis' : process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? 'blob' : null;

export type PublicEntry = ReturnType<typeof publicTop>[number];

// ------------------------------------------------------------------ Lua (each runs atomically in Redis)
// Shared tail: read the top N rows and the total count.
const TOP_TAIL = `
local ids = redis.call('ZREVRANGE', KEYS[1], 0, TOPN - 1)
local rows = {}
if #ids > 0 then rows = redis.call('HMGET', KEYS[2], unpack(ids)) end
`;

/** ARGV: member, score, entryJson, maxStored, top -> {improved, rank0 or -1, best, total, rows} */
const SAVE = `
local TOPN = tonumber(ARGV[5])
local old = redis.call('ZSCORE', KEYS[1], ARGV[1])
local improved = 0
if (not old) or tonumber(ARGV[2]) > tonumber(old) then
  redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
  improved = 1
  local n = redis.call('ZCARD', KEYS[1])
  local max = tonumber(ARGV[4])
  if n > max then
    local drop = redis.call('ZRANGE', KEYS[1], 0, n - max - 1)
    redis.call('ZREM', KEYS[1], unpack(drop))
    redis.call('HDEL', KEYS[2], unpack(drop))
  end
end
local rank = redis.call('ZREVRANK', KEYS[1], ARGV[1])
local best = redis.call('ZSCORE', KEYS[1], ARGV[1])
${TOP_TAIL}
return {improved, rank or -1, best or '0', redis.call('ZCARD', KEYS[1]), rows}
`;

/** ARGV: top -> {total, rows} */
const READ = `
local TOPN = tonumber(ARGV[1])
${TOP_TAIL}
return {redis.call('ZCARD', KEYS[1]), rows}
`;

/** ARGV: member, top -> {removed, total, rows} */
const REMOVE = `
local TOPN = tonumber(ARGV[2])
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
${TOP_TAIL}
return {removed, redis.call('ZCARD', KEYS[1]), rows}
`;

/** Turn HMGET rows into public top-N entries (ties: earlier run first). */
function toTop(rows: unknown): PublicEntry[] {
  const list: Entry[] = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (typeof r !== 'string') continue;
    try {
      const e = JSON.parse(r) as Entry;
      if (e && typeof e.score === 'number' && typeof e.name === 'string') list.push(e);
    } catch {
      /* skip corrupt row */
    }
  }
  list.sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
  return publicTop(list);
}

// ------------------------------------------------------------------ public API used by the routes
export async function readBoard(): Promise<{ entries: PublicEntry[]; total: number }> {
  if (redis) {
    const [total, rows] = (await redis.eval(READ, [ZKEY, HKEY], [String(TOP)])) as [number, unknown];
    return { entries: toTop(rows), total: Number(total) };
  }
  const all = await readEntries();
  return { entries: publicTop(all), total: all.length };
}

export interface SaveResult {
  rank: number | null;
  best: number;
  improved: boolean;
  entries: PublicEntry[];
}

/** Keep each nickname's best score. */
export async function saveScore(entry: Entry): Promise<SaveResult> {
  if (redis) {
    const [improved, rank0, best, , rows] = (await redis.eval(SAVE, [ZKEY, HKEY], [
      entry.key,
      String(entry.score),
      JSON.stringify(entry),
      String(MAX_STORED),
      String(TOP),
    ])) as [number, number, string, number, unknown];
    const r = Number(rank0);
    return { rank: r >= 0 && r < TOP ? r + 1 : null, best: Number(best) || entry.score, improved: Number(improved) === 1, entries: toTop(rows) };
  }
  return mutate((entries) => {
    const existing = entries.find((e) => e.key === entry.key);
    let improved = false;
    if (!existing) {
      entries.push(entry);
      improved = true;
    } else if (entry.score > existing.score) {
      Object.assign(existing, entry);
      improved = true;
    }
    return {
      save: improved,
      result: (list) => {
        const idx = list.findIndex((e) => e.key === entry.key);
        return { rank: idx >= 0 && idx < TOP ? idx + 1 : null, best: idx >= 0 ? list[idx].score : entry.score, improved, entries: publicTop(list) };
      },
    };
  });
}

export async function removeEntry(key: string): Promise<{ removed: number; entries: PublicEntry[]; total: number }> {
  if (redis) {
    const [removed, total, rows] = (await redis.eval(REMOVE, [ZKEY, HKEY], [key, String(TOP)])) as [number, number, unknown];
    return { removed: Number(removed), entries: toTop(rows), total: Number(total) };
  }
  return mutate((entries) => {
    const before = entries.length;
    const kept = entries.filter((e) => e.key !== key);
    entries.length = 0;
    entries.push(...kept);
    const removed = before - kept.length;
    return { save: removed > 0, result: (list) => ({ removed, entries: publicTop(list), total: list.length }) };
  });
}

export async function clearBoard(): Promise<void> {
  if (redis) {
    await redis.del(ZKEY, HKEY);
    return;
  }
  await mutate((entries) => {
    const had = entries.length;
    entries.length = 0;
    return { save: had > 0, result: () => null };
  });
}
