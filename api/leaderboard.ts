import { isAdmin, json, preflight } from './_lib/core.js';
import { clearBoard, readBoard } from './_lib/store.js';

export const OPTIONS = preflight;

/** GET /api/leaderboard — top 10 plus how many participants are stored. */
export async function GET() {
  try {
    return json(200, await readBoard());
  } catch (e) {
    console.error('read failed', e);
    return json(503, { error: 'Leaderboard unavailable.' });
  }
}

/** DELETE /api/leaderboard — admin clears the whole board. */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return json(401, { error: 'unauthorised' });
  await clearBoard();
  return json(200, { entries: [], total: 0 });
}
