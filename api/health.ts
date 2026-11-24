import { json } from './_lib/core.js';

/** GET /api/health — also reports whether Blob storage is configured. */
export function GET() {
  const storage = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
  return json(200, { ok: true, storage });
}
