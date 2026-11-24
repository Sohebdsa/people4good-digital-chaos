import { cleanName, clientIp, ENVS, int, isAdmin, json, limited, mutate, plausible, preflight, publicTop, readJson, TOP } from './_lib/core.js';

export const OPTIONS = preflight;

/** POST /api/scores — save a run; each nickname keeps its best score. */
export async function POST(req: Request) {
  if (limited(`post:${clientIp(req)}`)) return json(429, { error: 'Too many submissions, try again in a minute.' }, { 'retry-after': '60' });
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
  try {
    const out = await mutate((entries) => {
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
      return {
        save: improved,
        result: (list) => {
          const idx = list.findIndex((e) => e.key === key);
          return { rank: idx >= 0 && idx < TOP ? idx + 1 : null, best: idx >= 0 ? list[idx].score : score, improved, entries: publicTop(list) };
        },
      };
    });
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
  const out = await mutate((entries) => {
    const before = entries.length;
    const kept = entries.filter((e) => e.key !== key);
    entries.length = 0;
    entries.push(...kept);
    const removed = before - kept.length;
    return { save: removed > 0, result: (list) => ({ removed, entries: publicTop(list), total: list.length }) };
  });
  return json(out.removed ? 200 : 404, out);
}
