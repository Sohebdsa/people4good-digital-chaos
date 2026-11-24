# PEOPLE4GOOD: Escape the Digital Chaos

A 3D endless runner for NGO professionals about digital transformation, data protection and responsible AI.
You play **Kiri**, a field-operations lead who runs through five environments, from *The Manual Maze* to
*Responsible Innovation City*. Along the way you collect digital tools, avoid 20 organisational risks and make
decisions at Decision Gates. A separate self-assessment and a 90-day roadmap generator turn the session into a
practical plan.

See [DESIGN.md](DESIGN.md) for the creative and technical design.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

Requires Node 18+ and a WebGL-capable browser. Everything runs in the browser. No backend, no accounts, no external
assets: all 3D models, music and sound effects are generated procedurally at runtime.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Change lane | A / D or ← / → | Swipe left / right |
| Jump (low risks) | W / ↑ / Space | Swipe up |
| Slide (floating risks) | S / ↓ | Swipe down |
| Pause | Esc / P | Pause button |
| Decision Gate answer | 1 / 2 / 3 or A / B / C, Enter to continue | Tap |

Risks come in three readable shapes. **Low** ones (amber base) are jumped over. **Floating** ones (hover beams) are
slid under. **Walls** need a lane change. Every row of risks leaves at least one passable lane.

## Features

- **Gameplay:** 3 lanes, jump and slide physics, speed and density that increase over distance, fair pattern
  generation, 3 health, invulnerability frames, combo multiplier (up to x5, x10 with the AI boost).
- **20 risks** in three categories (data management, privacy & security, AI governance). Each has its own model,
  shape, sound, a one-line message on collision and a detailed entry in the Knowledge Center.
- **15 collectibles** and **6 power-ups**: Data Protection Shield, AI Productivity Boost, Automation Boost, Data
  Magnet, Backup Shield and Human Oversight.
- **10 Decision Gate scenarios**, some with 2 options and some with 3, shown in random order. A good choice gives
  +200 points and +1 health. A risky choice costs 1 health (never fatal), unless Human Oversight catches it.
- **5 environments** that cross-fade lighting, scenery and music as you run. Reaching one unlocks it as a start point.
- **7 missions, 8 achievements** and an Impact Points total, saved in localStorage.
- **Digital Maturity Self-Assessment:** 6 weighted areas, 30 questions, a radar chart, strengths, improvement
  areas and next steps. It is labelled as an educational self-assessment and is kept separate from the game score.
- **90-day roadmap:** generated from the assessment and fully editable (action, area, priority, role,
  timeline, resources, success metric, status). It exports to PDF together with the workshop worksheets.
- **Workshop Mode (3 days):** objectives, discussion prompts, themed runs that put the day's Decision Gates first,
  and worksheets (problem identification, tools discovery, AI experiment sheet, automation opportunities,
  priorities, roadmap).
- **Knowledge Center:** sections A–E (fundamentals, data management, AI fundamentals, responsible AI, tools
  discovery), plus a guide to all 20 risks and the collectibles.
- **Audio:** Web Audio synthesis for every sound effect and an adaptive music sequencer that changes per
  environment. Music volume, effects volume and mute settings. Audio starts on your first interaction.

## Project structure

```
src/
  game/          engine (loop, input), player, world streaming, spawning, effects, procedural models
  components/    React UI: menu, HUD, gate, pause, game over, learning, assessment, roadmap, workshop…
  systems/       audio, progression (missions/achievements), persistence, PDF export
  data/          all educational content: risks, tools, scenarios, environments, learning, assessment, roadmap
  store/         Zustand stores (persistent app state, transient run/HUD state)
```

The run is driven by an imperative Three.js engine, not React Three Fiber. The per-frame loop never re-renders
React, and the HUD reads a store that updates about 12 times a second. The engine pools obstacles,
collectibles and scenery, shares geometries and materials, draws particles in one instanced call, clamps the
frame time, pauses when the tab is hidden, and has a Low graphics setting with no shadows and a 1x pixel ratio.

## Performance & polish pass

These changes follow the installed gamedev skills (`performance-optimization`,
`threejs-scene-setup`, `threejs-materials-lighting`, `game-feel` and `camera-systems`).
Every change was measured before and after on the same scenes. The numbers below are desktop CPU
time per frame (update plus render submit) with frames uncapped, measured with the browser pane
hidden, so they don't include GPU time.

| Scene | Draw calls (before → after) | CPU avg (before → after) | Worst frame (before → after) |
|---|---|---|---|
| Menu | 180 → 40 | 1.67 → 0.81 ms | 97 → 3 ms |
| Manual Maze run | 933 → 192 | 4.17 → 2.17 ms | 44 → 20 ms |
| Data Security run | 992 → 455* | 5.45 → 3.38 ms | 12.5 → 6.4 ms |
| Innovation City run | 801 → 232 | 5.37 → 3.55 ms | 11.5 → 6.3 ms |

\*Scenery is random, so Security's draw-call count varies between about 320 and 460.

- **Static batching** (`src/game/models/bake.ts`): each prop's static meshes are merged by
  material, and plain-colour parts are folded into one shared vertex-colour material. Animated
  parts and articulated joints stay separate.
- **Shared prototypes:** each model is built once and then cloned, so every instance reuses
  the same GPU buffers. The geometry count stays flat (397) instead of growing during a run.
- **Prewarm:** every model, texture and shader, including the shadow-depth shaders, is built
  and uploaded while the menu is idle, in slices of 6 ms or less. This removed the first-use
  spikes.
- **Adaptive resolution:** the pixel ratio starts at 1.5. It drops in 0.25 steps when frames
  are slow for a sustained period, and only rises again after 10 s of headroom.
- **Frame-rate-independent smoothing** (`1 - exp(-k·dt)`) for the camera, lane change, speed and
  pose blending, so the game feels the same at 60 and 144 Hz.
- **Lighting:** a PMREM RoomEnvironment for soft reflections on PBR surfaces, a sky dome that
  blends to the fog colour, and 2048 shadow maps on the High setting.
- **Game feel:** trauma-based camera shake (trauma squared, summed sines, real-time decay),
  hit-stop that copes with overlapping hits, squash and stretch on jump, slide and land, landing
  dust, a red edge flash on hits, and a pop on the tool counter. Reduce Motion turns the shake off
  and softens the flash.

Still to check on real hardware: GPU time and thermal throttling on a mid-range phone.

## Sprites

There are 190 original 2D sprites in `public/assets/sprites/`. They are rendered from the game's
own 3D models, following the `create-game-assets` skill, so they share its palette, proportions
and lighting. Each has a 2–3 px ink outline to match the UI. The art direction and technical
contract (sizes, anchors, naming) are in [docs/art-direction-brief.md](docs/art-direction-brief.md).

| Folder | Contents |
|---|---|
| `character/side`, `character/front` | Kiri: idle, run, jump, slide, lane-switch, collect, powerup, hit, celebrate, game-over (58 frames per view) |
| `character/portrait.png` | UI portrait |
| `obstacles/` | all 20 risks |
| `items/`, `powerups/` | 15 collectibles and 6 power-ups |
| `scenery/` | 26 props across the five environments, plus the Decision Gate |
| `backgrounds/` | one 1024×512 backdrop per environment |
| `atlas/` | 5 packed atlases with TexturePacker JSON Hash data (frames, pivots, animations with fps and loop), ready for Phaser or PixiJS |
| `manifest.json` | per-asset technical, provenance and verification record |

The game UI uses them in the Knowledge Center, the Learning Summary, the start picker
backdrops, the HUD power-up badges and the in-run toasts. Sprites load lazily, so they
don't add to the game's startup download.

**Two styles.** `public/assets/sprites/realistic/` holds a second full set (same files and atlases)
rendered with smooth surfaces, physically based plastic, metal and paper materials with surface
grain, a high studio key light and soft contact shadows, and no ink outline. The game uses the
realistic set by default. **Settings → Sprite style** switches between Realistic and
Illustrated. To regenerate the realistic set, open `/sprites.html?style=realistic`, then run
`python tools/pack_sprites.py --style realistic`.

**Regenerate** after changing a model:

1. Run `npm run dev` and open http://localhost:5173/sprites.html. Add `?only=character,items`
   to render only some families.
2. Run `npm run sprites:pack`. This runs the skill's `asset_report.py` QA, rebuilds the atlases
   and the manifest, and exits non-zero if any check fails.

The `/__sprite-save` endpoint that writes the files exists only on the dev server and only
writes PNGs inside `public/assets/sprites`.

## Content notes

- Paper is not portrayed as wrong. The risk is unmanaged, disconnected or insecure information.
- Tool names (KoboToolbox, ODK, ChatGPT, Power BI, etc.) are examples, not endorsements.
- Scenarios and the assessment are educational and are not legal advice or a certified rating.
- No personal data is collected. Everything stays in the browser's localStorage. **Settings → Reset all
  progress** clears it.
