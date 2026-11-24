import { json } from './_lib/core.js';
import { storageKind } from './_lib/store.js';

/** GET /api/health — reports which leaderboard storage is active ("redis", "blob", or none). */
export function GET() {
  return json(200, { ok: true, storage: !!storageKind, backend: storageKind });
}
