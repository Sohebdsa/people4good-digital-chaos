import { cleanName, clientIp, ENVS, int, isAdmin, json, limited, plausible, preflight, readJson } from './_lib/core.js';
import { removeEntry, saveScore } from './_lib/store.js';

export const OPTIONS = preflight;

/** POST /api/scores — save a run; each nickname keeps its best score. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // A whole venue on one Wi-Fi shares a public IP, so the per-IP cap is only an abuse ceiling;
  // the real limit is per player (IP + nickname) further down.
  if (limited(`post:${ip}`, 600)) return json(429, { error: 'Too many submissions, try again in a minute.' }, { 'retry-after': '60' });
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch (e) {
    return json((e as Error).message === 'too large' ? 413 : 400, { error: 'Invalid JSON.' });
  }
  const name = cleanName(body.name);
  const score = int(body.score, 0, 50_000_000);
  const distance = int(body.distance, 0, 1_000_000);
  const gatesCorrect = int(body.gatesCorrect ?? 0, 0, 1000);
  const env = typeof body.env === 'string' && ENVS.has(body.env) ? body.env : 'maze';
  if (!name) return json(400, { error: 'Nickname must be 1-16 letters, numbers, spaces, dots, dashes or underscores.' });
  if (score === null || distance === null || gatesCorrect === null) return json(400, { error: 'Invalid score data.' });
  if (!plausible(score, distance, gatesCorrect)) return json(422, { error: 'Score rejected as implausible.' });

  const key = name.toLocaleLowerCase();
  if (limited(`post:${ip}:${key}`, 10)) return json(429, { error: 'Too many submissions, try again in a minute.' }, { 'retry-after': '60' });
  try {
    const out = await saveScore({ name, key, score, distance, env, gatesCorrect, at: new Date().toISOString() });
    return json(200, out);
  } catch (e) {
    console.error('save failed', e);
    return json(503, { error: 'Leaderboard is busy, please try again.' });
  }
}

/** DELETE /api/scores?name=<nickname> — admin removes one participant. */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return json(401, { error: 'unauthorised' });
  const key = (new URL(req.url).searchParams.get('name') ?? '').normalize('NFKC').trim().toLocaleLowerCase();
  const out = await removeEntry(key);
  return json(out.removed ? 200 : 404, out);
}
