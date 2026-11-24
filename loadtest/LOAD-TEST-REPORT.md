# Load test report: Digital Chaos on Vercel

**Target:** https://people4good-digital-chaos.vercel.app (production, region `bom1`)
**Date:** 2026-11-24
**Tool:** [`loadtest/loadtest.mjs`](loadtest.mjs). Raw results are in [`loadtest/results/`](results/).

## Verdict

**Before the fix (Vercel Blob leaderboard): it can't handle 50–100 players.**
**After the fix (Upstash Redis + per-player rate limit): it handles 100 players with no failures.**

| Part of the system | Before: 50 | Before: 100 | **After: 50** | **After: 100** |
|---|---|---|---|---|
| Game loads | ✅ | ✅ | ✅ | ✅ |
| Viewing the leaderboard | ✅ | ⚠️ 83% "offline" after a mass submit | ✅ | ✅ |
| Saves that worked, normal play | ❌ 90% | ❌ 33% | ✅ **100%** | ✅ **100%** |
| Saves that worked, everyone at once | ❌ 52% | ❌ 20% | ✅ **100%** | ✅ **100%** |
| Time for everyone-at-once submit | 30 s | 30 s+ | **1.9 s** | **1.5 s** |

Playing the game was always fine, because it runs entirely in each player's browser. The weak point was the **shared leaderboard save**, and the fix resolves it (see [After the fix](#after-the-fix-redis)).

## After the fix (Redis)

**What changed:**
- **[`api/_lib/store.ts`](../api/_lib/store.ts):** the leaderboard is now stored in Upstash Redis (`upstash-kv-byzantium-diamond`). Each save is one atomic step, so saves never collide or retry. If Redis isn't connected, the code falls back to the old Blob file.
- **[`api/scores.ts`](../api/scores.ts):** the rate limit is now **10 saves a minute per player** (internet address + nickname). The per-address ceiling went up from 60 to 600 a minute, so a whole venue on one Wi-Fi is fine.

**How it was tested:** same script, same 2 rounds plus a spike, run against a preview deployment of the fix (runs R50 and R100).

| Run | Phase | Saves | Player sees it saved | Median time | p95 time | Failures |
|---|---|---|---|---|---|---|
| 50 | normal play | 100 | **100%** | 93 ms | 213 ms | 0 |
| 50 | everyone at once | 50 | **100%** | 1.7 s | 1.9 s | 0 |
| 100 | normal play | 200 | **100%** | 98 ms | 233 ms | 0 |
| 100 | everyone at once | 100 | **100%** | 1.2 s | 1.4 s | 0 |

Leaderboard reads: 100% OK, with p95 of **192 ms** during play and **1.0 s** right after a mass submit, well inside the 4 s client limit.

The ~1.5 s for the everyone-at-once submit is mostly 100 connections opening at the same moment from one test machine. During normal play a save takes about 0.1 s.

**Still worth knowing:**
- **Download size on venue Wi-Fi:** each player still downloads ~2.5 MB the first time. On a slow venue line, ask players to open the game a few minutes before starting.
- **Free Upstash plan limits:** an event of 100 players × a few rounds is a few thousand Redis commands, far inside the free plan's limits.

---

# Original findings (before the fix)

- At **50 players**, 1 in 10 saves failed during normal play. When everyone finished at the same time, **about half** of the players didn't get their score saved.
- At **100 players**, only **1 in 3** saves succeeded during normal play, and **1 in 5** when everyone submitted together.

## What was tested

Each virtual player does exactly what the real game does against the server:

1. **Opens the game.** It loads `index.html`, the JS/CSS bundles, the 5 sprite atlases and a background (17 files, ~2.5 MB).
2. **Plays 2 rounds.** Each round: open the leaderboard (`GET /api/leaderboard`), play for 15–45 s, submit the score (`POST /api/scores`), then view the leaderboard again.
3. **Spike.** All players submit at the same moment. This simulates a facilitator saying "time's up, everyone submit".

The players count as having seen a failure exactly when the real client would:

- **Reads:** the client gives up after **4 s** and shows a local "offline" board.
- **Saves:** the client gives up after **20 s** and stores the score on the device only.

| Run | Players | Notes |
|---|---|---|
| LT50 | 50 | Full asset download. The test machine's own internet (~0.29 MB/s) was the bottleneck here, see "Page load" below. |
| LT50b | 50 | HTML + API only, so the result measures the server. |
| LT100 | 100 | HTML + API only. |

## Results

### Saving scores (`POST /api/scores`): the crack

"Player sees it saved" means a 200 response that arrived within the client's 20 s limit.

| Run | Phase | Saves | Player sees it saved | Median time | p95 time | Failures |
|---|---|---|---|---|---|---|
| 50 | normal play (staggered) | 100 | **90%** | 4.1 s | 25.0 s | 7 × `503 busy` |
| 50 | everyone at once | 50 | **52%** | 19.8 s | 29.7 s | 14 × `503 busy` |
| 100 | normal play (staggered) | 200 | **33%** | 5.1 s | 28.5 s | 74 × `429`, 45 × `503`, 1 timeout |
| 100 | everyone at once | 100 | **20%** | 23.5 s | 30.0 s | 27 × `429`, 6 × `503`, 37 timeouts |

Even a single save takes **1–2 s**, and just **3** simultaneous saves took up to **5.4 s** in the smoke test.

### Viewing the leaderboard (`GET /api/leaderboard`)

| Run | Phase | Requests | OK | p50 | p95 | Over 4 s client limit |
|---|---|---|---|---|---|---|
| 50 | normal play | 200 | 100% | 108 ms | 1.1 s | 0 |
| 100 | normal play | 400 | 100% | 98 ms | 216 ms | 0 |
| 100 | right after mass submit | 100 | 100% | 4.4 s | 8.6 s | **83** |

Reads are fast on their own. When they queue behind the save storm, though, 83 of 100 players got the "offline" board.

### Page load (static files)

- HTML: 100% OK, with p95 of **161 ms** at 100 players.
- Assets are served from Vercel's CDN with `X-Vercel-Cache: HIT`. **Vercel isn't a bottleneck here.**
- The full-asset 50-player run did show timeouts. Those came from the test machine's ~0.29 MB/s connection trying to download 125 MB at once, so they aren't a server problem.
- They do point at a real-world risk, though. Each player downloads **~2.5 MB**. **100 players on one venue Wi-Fi = ~250 MB at once.** On a 20 Mbit/s venue line, the last players would wait **~1.5 minutes** for the game to open.

## What cracks, and why

### 1. One shared file for every save (root cause)

The leaderboard is a single JSON file in Vercel Blob (`leaderboard/leaderboard.json`). Every save works like this ([`api/_lib/core.ts`](../api/_lib/core.ts)):

1. Download the whole file.
2. Change it.
3. Upload it with "only if nobody else changed it" (ETag).

That means only **one save can succeed at a time**, and each one takes ~1–2 s of Blob round trips. With 50 players saving together, 49 of them lose the race, back off, and retry. After 12 tries (~25 s) the server gives up with `503 "Leaderboard is busy"`. That's past the client's 20 s limit, so the player has already been moved to the offline board.

Throughput ceiling: roughly **1 save per second** for the whole event, no matter how many servers Vercel starts.

### 2. Rate limit is per IP address

`POST /api/scores` allows **60 saves per minute per IP** (per function instance). At a workshop, **everyone on the venue Wi-Fi shares one public IP**. In the 100-player run, **101 of 300 saves were rejected with `429 Too many submissions`** for this reason alone.

### 3. Failures are silent to players

On a `503` or a timeout, the client saves the score **only on that device** and shows a local board ([`src/systems/leaderboard.ts`](../src/systems/leaderboard.ts)). The player may believe they're on the shared leaderboard when they aren't. In addition, **10–14 saves per run succeeded on the server after the client had already given up**, so the player was shown "offline" even though the score was saved.

### 4. Cost grows with retries

Every retry is another Blob read and write. Under contention, one score can cost up to 24 Blob operations, which counts against the Blob operation quota.

## Recommended fixes (in priority order)

1. **Move the leaderboard to Upstash Redis** (Vercel Marketplace, free tier is enough).
   - Use a sorted set: `ZADD leaderboard GT <score> <nickname>` for saves, `ZREVRANGE … 0 9 WITHSCORES` for the top 10.
   - Each save becomes a single atomic call of a few milliseconds, with no conflicts and no retries. This removes crack #1 and #4 and comfortably handles hundreds of players.
2. **Fix the rate limit for shared Wi-Fi.** Key it on `IP + nickname`, for example `post:${ip}:${name}` with ~10/min. Alternatively, raise the per-IP limit to ~600/min. This removes crack #2.
3. **Make save failures visible and retried.** On `429`, `503` or a timeout, keep the score in a pending queue, retry in the background, and show "saving…" instead of quietly switching to the local board.
4. **Optional:** shrink the first load. The character atlases are ~600 KB each, and converting the sprite PNGs to WebP would roughly halve the 2.5 MB. This matters for slow venue Wi-Fi.

After fix 1 and fix 2, rerun this test to confirm the result.

## How to rerun

```powershell
node loadtest/loadtest.mjs --users 50 --assets none
```

```powershell
node loadtest/loadtest.mjs --users 100 --assets none
```

Options: `--rounds 2`, `--play 15-45` (seconds per round), `--assets full|none`, `--tag LTxx` (nickname prefix), `--url <deployment>`.

Use `--assets full` only from a fast connection, otherwise the test machine becomes the bottleneck.

To test a protected preview deployment, set `VERCEL_BYPASS` to the project's Protection Bypass for Automation secret first.

## ⚠️ Cleanup needed

- **Redis:** the fix tests left **150 test entries** in Redis, named `R50-…` and `R100-…`. Production will use this same Redis database once the fix is deployed, so press **Clear board** in the admin panel **after deploying and before players arrive**.
- **Blob:** the old Blob file still holds ~180 `LT…` entries. Once production runs on Redis, nothing reads that file any more, so they won't show.
