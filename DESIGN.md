# PEOPLE4GOOD: Escape the Digital Chaos — Design Document

## 1. Concept & storyline
**Kiri Osei-Lane**, a field-operations lead at a fictional community NGO, wakes up inside *Digital Chaos* — a world built
from her organisation's own operational mess: drifting paper registers, disconnected spreadsheets, open vaults and
unreviewed AI output. Her backpack ("the Toolkit") can absorb good digital practices. Every tool she gathers and every
responsible decision she takes rebuilds the world around her, from the **Manual Maze** through **Spreadsheet City**, the
**Data Security District** and the **AI Frontier**, until she reaches **Responsible Innovation City** — the NGO as it
could be.

The run is the story: the world visibly matures as distance grows (lighting warms, clutter turns into ordered
infrastructure, music resolves from minor to major).

## 2. Art direction
- Stylised low-poly 3D, flat-shaded, built procedurally from shared geometries/materials (no external model files,
  nothing to go missing, tiny download).
- One coherent palette per environment, sharing an ink-navy shadow tone and a warm sunflower "good practice" accent:
  | Environment | Mood | Key colours |
  |---|---|---|
  | Manual Maze | dusty archive, late afternoon | kraft brown, manila, faded teal |
  | Spreadsheet City | grid metropolis, hazy noon | spreadsheet green, white cells, slate |
  | Data Security District | night, vault steel | indigo, steel, warning amber |
  | AI Frontier | dusk, glass & light | violet, cyan accents, warm haze |
  | Responsible Innovation City | bright morning | cream, teal, leafy green, sunflower |
- Good things (collectibles, power-ups) glow softly and spin; risks are matte, heavy, slightly tilted — readable at speed by
  silhouette + colour, not by text.
- Restraint: no bloom, no rainbow gradients, emoji never used as 3D assets.

## 3. Character
Kiri: rounded friendly proportions (~4.5 heads), teal field jacket with sunflower trim, cargo trousers, mustard backpack
with a tablet and a small antenna, smartwatch, curly hair in a bun. Procedural skeletal-style animation over a joint
hierarchy (hips → torso → head/arms, legs) with blended poses: idle, run, jump, slide, lane-lean, collect, power-up spin,
hit flinch, celebrate, game-over collapse.

## 4. Environments
Five biomes, each with its own track surface, side scenery set, fog/sky/light palette, obstacle mix and music variation.
Biomes advance with distance and cross-fade (lighting/fog lerp; scenery spawn sets switch). Reaching a biome unlocks it as
a start point (used heavily by Workshop Mode).

## 5. Gameplay
- 3 lanes, world scrolls toward a chase camera. Delta-time loop, clamped dt.
- Jump (impulse + gravity), slide (timed, lowered hitbox), smooth lane switching, swipe + keyboard.
- Risks come in three readable shapes: **low** (jump it), **overhead** (slide under it), **wall** (change lanes).
  Pattern generator guarantees at least one passable lane per row, minimum reaction gaps scaled to speed.
- 3 health hearts, brief invulnerability after a hit, short one-line lesson toast on collision.
- 15 collectibles (points + combo multiplier), 6 power-ups, decision gates every ~550 m.

## 6. Educational systems
- **In run:** one-line lessons on collision/pickup only; detail lives in the Knowledge Center (encyclopedia unlocks as
  items are encountered).
- **Decision Gates:** time slows to a stop, scenario card, 2–3 choices (shuffled), consequence + explanation.
- **Missions & achievements** reward breadth (collecting every category) and good judgement (gates), not only score.
- **Separate Digital Maturity Self-Assessment** (6 weighted areas) — never mixed with game score.
- **90-day Roadmap generator** from the assessment, fully editable, exported as PDF.
- **Workshop Mode** (3 days) links game activities to assessment outputs and worksheets.
- Content guardrails: paper isn't "bad", tools are examples not endorsements, scenarios are educational not legal advice.

## 7. Technical architecture
- React 18 + TypeScript + Vite for the shell (menus, HUD, learning content).
- **Imperative Three.js engine** (not React Three Fiber) for the run: per-frame work never touches React; HUD reads a
  throttled Zustand store (~10 Hz). This follows the web-games skill's "hybrid DOM shell + canvas guest" guidance.
- Object pooling for obstacles/collectibles/scenery/particles; shared geometries & materials; instancing-friendly reuse.
- Web Audio API synthesis for all SFX and a procedural multi-track music sequencer (original audio, no licensing,
  unlocked on first gesture).
- Persistence: localStorage (settings, best score, progress, missions, achievements, assessment, roadmap, worksheets).
- PDF: jsPDF + autotable, lazy-loaded.
- Pause on Escape / visibility change; adaptive pixel ratio & shadow quality setting.

## 8. Milestones
1. Engine, track, camera, player movement → 2. character + animations + collision → 3. 20 risks, 15 tools, power-ups,
scoring → 4. five biomes → 5. decision gates → 6. menus/HUD/learning → 7. assessment, roadmap, PDF, workshop →
8. audio & polish → 9. browser testing (desktop + mobile viewport).
