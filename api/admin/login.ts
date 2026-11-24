import { checkPassword, clientIp, json, limited, preflight, readJson } from '../_lib/core.js';

export const OPTIONS = preflight;

/** POST /api/admin/login — 200 when the admin password is right. */
export async function POST(req: Request) {
  if (limited(`login:${clientIp(req)}`, 10)) return json(429, { error: 'Too many attempts, wait a minute.' }, { 'retry-after': '60' });
  let body: Record<string, unknown>;
  try {
    body = await readJson(req);
  } catch {
    return json(400, { error: 'Invalid JSON.' });
  }
  return checkPassword(body.password) ? json(200, { ok: true }) : json(401, { error: 'Wrong admin password.' });
}
