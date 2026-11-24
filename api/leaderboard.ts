import { isAdmin, json, mutate, preflight, publicTop, readEntries } from './_lib/core.js';

export const OPTIONS = preflight;

/** GET /api/leaderboard — top 10 plus how many participants are stored. */
export async function GET() {
  try {
    const entries = await readEntries();
    return json(200, { entries: publicTop(entries), total: entries.length });
  } catch (e) {
    console.error('read failed', e);
    return json(503, { error: 'Leaderboard unavailable.' });
  }
}

/** DELETE /api/leaderboard — admin clears the whole board. */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return json(401, { error: 'unauthorised' });
  await mutate((entries) => {
    const had = entries.length;
    entries.length = 0;
    return { save: had > 0, result: () => null };
  });
  return json(200, { entries: [], total: 0 });
}
