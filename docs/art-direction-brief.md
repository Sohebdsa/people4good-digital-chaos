# Art direction brief — sprites

## Game frame

- Player fantasy: an NGO field lead escaping operational chaos by collecting good digital practice.
- Core verbs: run, switch lane, jump, slide, collect, decide.
- Engine and renderer: React + three.js r169 (WebGL). Sprites are used by the DOM UI, and the
  atlases are also ready for a 2D runtime such as Phaser or PixiJS.
- Target platforms: desktop and mobile browsers.
- Camera/view/facing: rendered with an orthographic camera.
  - Character: side view facing screen-right, plus a front three-quarter view.
  - Obstacles: front three-quarter from the upper right.
  - Items: near-front.
  - Props: three-quarter.
- Typical on-screen size: icons 32–96 CSS px, character frames 96–192 px, backdrops 300–1024 px.

## Visual system

- Shape language: chunky stylised low-poly with rounded friendly forms. Risks are heavy, matte
  and slightly tilted; good practices are glowing, upright and tidy.
- Silhouette priorities: the character's backpack, bun and jacket must read at 64 px. Each
  obstacle must have a unique silhouette (lock, vault, scale, drone, wall of cards).
- Palette roles: ink `#14213d` (outline and shadow), sunflower `#ffc93c` (good practice),
  teal `#1fb5a8` (protection), violet `#9b5de5` (AI), coral `#e76f51` (human oversight),
  danger `#e63946` (risk). Each environment also has its own sky and ground palette (DESIGN.md).
- Materials: flat-shaded PBR with soft environment reflections. No textures except UI-like
  canvas labels.
- Edge treatment: 2–3 px ink outline around solid pixels only, matching the UI's sticker cards.
  Translucent glows and bubbles are not outlined.
- Lighting: warm key from the upper left-front, cool rim from behind-right, hemisphere fill.
- Exclusions: no photographic textures, no real logos or brand marks, no AI-generated imagery.

## Technical contract

| Family | Canvas | Alpha | Anchor / pivot | Files |
|---|---|---|---|---|
| Character, side | 288×192 | yes | feet at (0.628, 0.962) | `character/side/<anim>-NN.png` |
| Character, front | 192×192 | yes | feet at (0.5, 0.962) | `character/front/<anim>-NN.png` |
| Portrait | 256×256 | yes | centre | `character/portrait.png` |
| Obstacles | 256×256 | yes | centre (auto-fitted) | `obstacles/<risk-id>.png` |
| Items / power-ups | 192×192 | yes | centre | `items/<tool-id>.png`, `powerups/<id>.png` |
| Scenery | 320×320 (gate 384×320) | yes | bottom-centre ≈ (0.5, 0.95) | `scenery/<env>-<n>.png` |
| Backdrops | 1024×512 | no (opaque) | — | `backgrounds/<env>.png` |

- **Character animations:** idle, run, jump, slide, lane-switch, collect, powerup, hit,
  celebrate and game-over. Frames, fps and loop flags are in `atlas/character-*.json`.
- **Atlases:** `atlas/<family>.png` and `.json` (TexturePacker JSON Hash), 2 px padding,
  dimensions in multiples of 4.
- **Format and filtering:** sRGB PNG with straight alpha, 2× supersampled. Use linear filtering
  (these are illustrations, not pixel art).

## Visual target

- Seed: the procedural 3D models in `src/game/models`. Regenerate the sprites with
  `npm run dev`, open `/sprites.html` (optionally `?only=character,items,obstacles,scenery,backgrounds`),
  then run `python tools/pack_sprites.py`.
- Approved seed batch: items and power-ups, reviewed as a contact sheet before the full run.
