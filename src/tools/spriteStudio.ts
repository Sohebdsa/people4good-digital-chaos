/**
 * Sprite Studio (dev tool, not part of the game build).
 * Renders 2D sprites from the game's own procedural 3D models so the sprite set shares the exact
 * palette, proportions and lighting of the 3D game:
 *  - character animation frames (side + front three-quarter views)
 *  - 20 obstacles, 15 collectibles, 6 power-ups, the decision gate
 *  - scenery props per environment and one backdrop per environment
 * Every sprite: transparent background, fixed canvas, 2x supersampled, ink outline matching the UI.
 * Files are written to public/assets/sprites via the dev-only /__sprite-save endpoint.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildRisk } from '../game/models/riskModels';
import { buildTool, buildPower, buildGate } from '../game/models/toolModels';
import { buildScenery, SCENERY } from '../game/models/scenery';
import { Player } from '../game/player/Player';
import { World } from '../game/world/World';
import { RISKS } from '../data/risks';
import { TOOLS, POWERS } from '../data/tools';
import { ENV_ORDER } from '../data/environments';
import type { EnvId } from '../data/types';
import { realify } from './realistic';

const SS = 2; // supersampling factor
/** ?style=realistic renders the photoreal-leaning set into sprites/realistic/ (no outline). */
const REAL = new URLSearchParams(location.search).get('style') === 'realistic';
const OUT_PREFIX = REAL ? 'realistic/' : '';
const KEY_DIR = REAL ? new THREE.Vector3(-3, 12, 4) : new THREE.Vector3(-4, 9, 7);
const status = document.getElementById('status')!;
const grid = document.getElementById('grid')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = REAL;
renderer.shadowMap.type = THREE.PCFShadowMap; // supports shadow.radius blur
if (REAL) renderer.toneMappingExposure = 1.05;

type Rig = { key: THREE.DirectionalLight; catcher: THREE.Mesh };

function lightRig(scene: THREE.Scene): Rig {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = REAL ? 0.95 : 0.35;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff6e5, 0x3a3f58, REAL ? 0.45 : 1.15));
  const key = new THREE.DirectionalLight(0xfff1dc, REAL ? 2.4 : 2.6);
  key.position.copy(KEY_DIR); // upper-left-front, same side as the in-game sun
  if (REAL) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 9;
    key.shadow.blurSamples = 16;
  }
  scene.add(key);
  scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xbfe6ff, REAL ? 1.3 : 1.1);
  rim.position.set(5, 4, -8); // separates the silhouette from any background
  scene.add(rim);
  // invisible floor that only shows the soft contact shadow
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.26 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  catcher.visible = REAL;
  scene.add(catcher);
  return { key, catcher };
}

/** Fit the key light's shadow camera tightly around an object so shadows stay crisp. */
function fitShadow(rig: Rig, box: THREE.Box3, floorY: number) {
  rig.catcher.position.y = floorY;
  const c = box.getCenter(new THREE.Vector3());
  const r = Math.max(1, box.getSize(new THREE.Vector3()).length() * 0.75);
  rig.key.position.copy(c).add(KEY_DIR.clone().normalize().multiplyScalar(r * 3));
  rig.key.target.position.copy(c);
  const sc = rig.key.shadow.camera;
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.1; sc.far = r * 6;
  sc.updateProjectionMatrix();
}

function boundsOf(obj: THREE.Object3D) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !visibleInTree(m)) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
  });
  return box;
}

const studio = new THREE.Scene();
const studioRig = lightRig(studio);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

type Frame = { cx: number; cy: number; halfW: number; halfH: number }; // in camera space

/** Fit an ortho frame around an object's bounds as seen from `dir` (centred, with margin). */
function autoFrame(obj: THREE.Object3D, dir: THREE.Vector3, aspect: number, margin = 0.08, floorY?: number): Frame {
  aimCamera(new THREE.Vector3(), dir);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !visibleInTree(m)) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
  });
  if (floorY !== undefined) {
    // include the shadow footprint: project the top of the box onto the floor along the key light
    const L = KEY_DIR.clone().normalize();
    const h = box.max.y - floorY;
    const off = new THREE.Vector3((-L.x / L.y) * h, 0, (-L.z / L.y) * h);
    for (const x of [box.min.x, box.max.x]) for (const z of [box.min.z, box.max.z]) box.expandByPoint(new THREE.Vector3(x, floorY, z).add(off));
  }
  const inv = ortho.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  let halfW = (maxX - minX) / 2;
  let halfH = (maxY - minY) / 2;
  if (halfW / halfH > aspect) halfH = halfW / aspect;
  else halfW = halfH * aspect;
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, halfW: halfW * (1 + margin), halfH: halfH * (1 + margin) };
}

function visibleInTree(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function aimCamera(target: THREE.Vector3, dir: THREE.Vector3) {
  ortho.position.copy(target).addScaledVector(dir.clone().normalize(), 60);
  ortho.up.set(0, 1, 0);
  ortho.lookAt(target);
  ortho.updateMatrixWorld(true);
}

function applyFrame(f: Frame) {
  ortho.left = f.cx - f.halfW;
  ortho.right = f.cx + f.halfW;
  ortho.top = f.cy + f.halfH;
  ortho.bottom = f.cy - f.halfH;
  ortho.updateProjectionMatrix();
}

/** Render the scene to a W×H canvas with an ink outline (supersampled, then downscaled). */
function shoot(scene: THREE.Scene, cam: THREE.Camera, w: number, h: number, outline = 2.5): HTMLCanvasElement {
  if (REAL) outline = 0; // realistic set: no illustrated ink outline
  renderer.setSize(w * SS, h * SS, false);
  renderer.render(scene, cam);
  const big = document.createElement('canvas');
  big.width = w * SS;
  big.height = h * SS;
  const bc = big.getContext('2d')!;
  if (outline > 0) {
    // ink silhouette: tint a copy, stamp it around a circle, then draw the colour render on top
    const tint = document.createElement('canvas');
    tint.width = big.width;
    tint.height = big.height;
    const tc = tint.getContext('2d')!;
    tc.drawImage(renderer.domElement, 0, 0);
    // outline only solid pixels: translucent parts (power-up bubbles, glows) must not turn into an ink fill
    const id = tc.getImageData(0, 0, tint.width, tint.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const solid = d[i + 3] > 140;
      d[i] = 0x14;
      d[i + 1] = 0x21;
      d[i + 2] = 0x3d;
      d[i + 3] = solid ? 255 : 0;
    }
    tc.putImageData(id, 0, 0);
    const r = outline * SS;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      bc.drawImage(tint, Math.cos(ang) * r, Math.sin(ang) * r);
    }
  }
  bc.drawImage(renderer.domElement, 0, 0);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const oc = out.getContext('2d')!;
  oc.imageSmoothingEnabled = true;
  oc.imageSmoothingQuality = 'high';
  oc.drawImage(big, 0, 0, w, h);
  return out;
}

let saved = 0;
async function save(file: string, canvas: HTMLCanvasElement, show = true) {
  file = OUT_PREFIX + file;
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch('/__sprite-save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file, dataUrl }) });
  if (!res.ok) throw new Error(`save failed ${file}: ${await res.text()}`);
  saved++;
  status.textContent = `${saved} sprites written… (${file})`;
  if (show) {
    const fig = document.createElement('figure');
    const img = new Image();
    img.src = dataUrl;
    fig.append(img);
    const cap = document.createElement('figcaption');
    cap.textContent = file;
    fig.append(cap);
    grid.append(fig);
  }
}

const hideNamed = (obj: THREE.Object3D, names: string[]) => obj.traverse((o) => { if (names.includes(o.name)) o.visible = false; });

/** Single object sprite (obstacle / item / prop). */
async function objectSprite(file: string, obj: THREE.Object3D, w: number, h: number, dir: THREE.Vector3, outline = 2.5, floorGap = 0) {
  studio.add(obj);
  let floorY: number | undefined;
  if (REAL) {
    realify(obj);
    const box = boundsOf(obj);
    floorY = box.min.y - floorGap;
    fitShadow(studioRig, box, floorY);
  }
  const f = autoFrame(obj, dir, w / h, 0.06, floorY);
  applyFrame(f);
  await save(file, shoot(studio, ortho, w, h, outline));
  studio.remove(obj);
}

// ---------------------------------------------------------------- character
type Anim = { name: string; frames: number; setup: (p: Player) => void; dt: number; warm?: number; settle?: number; mode?: 'run' };

async function characterSprites(manifest: Record<string, unknown>) {
  const scene = new THREE.Scene();
  const rig = lightRig(scene);
  const player = new Player(scene);
  player.shadow.visible = !REAL; // realistic set uses a real contact shadow instead of the blob
  if (REAL) {
    realify(player.rig.root);
    fitShadow(rig, new THREE.Box3(new THREE.Vector3(-1.5, 0, -1.5), new THREE.Vector3(1.5, 2.2, 1.5)), 0);
  }

  // fixed frame shared by every animation: feet on the bottom-centre anchor, same scale
  // side view needs room behind the feet for the slide / game-over poses
  // `back` shifts the feet towards the right edge (side view falls backwards to the left)
  const views: { id: string; dir: THREE.Vector3; w: number; h: number; halfW: number; back: number }[] = [
    { id: 'side', dir: new THREE.Vector3(1, 0.18, 0), w: 288, h: 192, halfW: 1.95, back: 0.5 }, // faces screen-right
    { id: 'front', dir: new THREE.Vector3(0.75, 0.32, -1), w: 192, h: 192, halfW: 1.3, back: 0 }, // three-quarter, face visible
  ];
  const anims: Anim[] = [
    { name: 'idle', frames: 8, dt: 0.4, settle: 0.8, setup: (p) => p.idle() },
    { name: 'run', frames: 8, dt: 0.6094 / 8, warm: 1, setup: (p) => (p.mode = 'run'), mode: 'run' },
    { name: 'jump', frames: 6, dt: 0.12, setup: (p) => { p.mode = 'run'; p.jump(); } },
    { name: 'slide', frames: 4, dt: 0.15, setup: (p) => { p.mode = 'run'; p.slide(); } },
    { name: 'lane-switch', frames: 4, dt: 0.05, setup: (p) => { p.mode = 'run'; p.left(); }, mode: 'run' },
    { name: 'collect', frames: 4, dt: 0.07, setup: (p) => { p.mode = 'run'; p.collect(); }, mode: 'run' },
    { name: 'powerup', frames: 6, dt: 0.09, setup: (p) => { p.mode = 'run'; p.spin(); }, mode: 'run' },
    { name: 'hit', frames: 4, dt: 0.1, setup: (p) => { p.mode = 'run'; p.hit(); }, mode: 'run' },
    { name: 'celebrate', frames: 8, dt: 0.09, settle: 0.4, setup: (p) => p.celebrate(true) },
    { name: 'game-over', frames: 6, dt: 0.18, setup: (p) => p.die() },
  ];
  const step = (p: Player, total: number, speed: number) => {
    const n = Math.max(1, Math.round(total / (1 / 120)));
    for (let i = 0; i < n; i++) p.update(total / n, speed);
  };
  const out: Record<string, unknown> = {};
  for (const view of views) {
    // frame fitted once to a standing pose, widened to fit slide/game-over poses
    aimCamera(new THREE.Vector3(0, 0, 0), view.dir);
    const f: Frame = { cx: 0, cy: 0, halfW: view.halfW, halfH: (view.halfW * view.h) / view.w };
    const feet = new THREE.Vector3(0, 0, 0).applyMatrix4(ortho.matrixWorldInverse);
    f.cx = feet.x - view.back;
    f.cy = feet.y + f.halfH - 0.1; // feet sit 0.1 units above the bottom edge
    applyFrame(f);
    for (const a of anims) {
      player.reset();
      player.x = 0;
      // settle into the base pose first
      player.mode = 'run';
      step(player, a.warm ?? 0.6, 14);
      a.setup(player);
      if (a.settle) step(player, a.settle, 0);
      for (let i = 0; i < a.frames; i++) {
        step(player, i === 0 ? 0.02 : a.dt, a.mode === 'run' || a.name === 'jump' || a.name === 'slide' ? 14 : 0);
        // engine moves the sprite; frames keep a fixed baseline
        player.rig.root.position.set(0, 0, 0);
        player.x = 0;
        player.shadow.position.set(0, 0.02, 0.05);
        player.shadow.scale.setScalar(1);
        player.shadow.visible = !REAL;
        player.rig.root.visible = true;
        await save(`character/${view.id}/${a.name}-${String(i).padStart(2, '0')}.png`, shoot(scene, ortho, view.w, view.h, 2), i === 0);
      }
      out[`${view.id}/${a.name}`] = { frames: a.frames, fps: Math.round(1 / a.dt), loop: ['idle', 'run', 'celebrate'].includes(a.name), size: [view.w, view.h], anchor: [+((view.halfW + view.back) / (2 * view.halfW)).toFixed(3), +(1 - 0.1 / (2 * f.halfH)).toFixed(3)] };
    }
  }
  // portrait for UI
  aimCamera(new THREE.Vector3(0, 1.55, 0), new THREE.Vector3(0.55, 0.12, -1));
  applyFrame({ cx: 0, cy: 0, halfW: 0.62, halfH: 0.62 });
  player.reset();
  player.idle();
  step(player, 1.2, 0);
  player.rig.root.position.set(0, 0, 0);
  await save('character/portrait.png', shoot(scene, ortho, 256, 256, 3));
  manifest.character = { anchor: 'bottom-center (feet 10% above bottom)', animations: out };
}

// ---------------------------------------------------------------- backgrounds
async function backgrounds() {
  for (const env of ENV_ORDER) {
    const scene = new THREE.Scene();
    const world = new World(scene);
    world.initEnvironment(renderer);
    world.setEnv(env as EnvId, true);
    world.reset(0);
    for (let i = 0; i < 6; i++) world.update(1 / 60, 30, i, 'high');
    if (REAL) {
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.parent !== scene) realify(o);
      });
      // ground, track and curbs (direct children) receive shadows; props cast them
      scene.children.forEach((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true; });
      world.setShadows(true);
      (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.8;
    }
    const cam = new THREE.PerspectiveCamera(58, 2, 0.1, 260);
    cam.position.set(0, 4.2, 7.5);
    cam.lookAt(0, 1.6, -18);
    renderer.setClearColor(0x000000, 1);
    await save(`backgrounds/${env}.png`, shoot(scene, cam, 1024, 512, 0));
    renderer.setClearColor(0x000000, 0);
  }
}

// ---------------------------------------------------------------- run
async function main() {
  const manifest: Record<string, unknown> = { generated: new Date().toISOString() };
  const params = new URLSearchParams(location.search);
  const only = params.get('only');
  const want = (k: string) => !only || only.split(',').includes(k);

  if (want('character')) await characterSprites(manifest);

  if (want('obstacles')) {
    const dir = new THREE.Vector3(0.55, 0.42, 1);
    for (const r of RISKS) {
      const g = buildRisk(r.id, r.shape);
      await objectSprite(`obstacles/${r.id}.png`, g, 256, 256, dir);
    }
  }
  if (want('items')) {
    const dir = new THREE.Vector3(0.35, 0.22, 1);
    for (const t of TOOLS) {
      const g = buildTool(t.id);
      hideNamed(g, ['ring']);
      const spin = g.getObjectByName('spin');
      if (spin) spin.rotation.y = t.id === 'ai_assistant' ? 0.25 : -0.35;
      await objectSprite(`items/${t.id}.png`, g, 192, 192, dir, 2.5, 0.18);
    }
    for (const p of POWERS) {
      const g = buildPower(p.id, p.color);
      hideNamed(g, ['ring']);
      const orbit = g.getObjectByName('orbit');
      if (orbit) orbit.rotation.set(1.1, 0.4, 0);
      await objectSprite(`powerups/${p.id}.png`, g, 192, 192, dir, 2.5, 0.12);
    }
  }
  if (want('scenery')) {
    const dir = new THREE.Vector3(0.6, 0.45, 1);
    for (const env of ENV_ORDER) {
      for (let v = 0; v < SCENERY[env].length; v++) {
        const g = buildScenery(env, v, v * 7 + 2);
        await objectSprite(`scenery/${env}-${v}.png`, g, 320, 320, dir);
      }
    }
    await objectSprite('scenery/decision-gate.png', buildGate(), 384, 320, new THREE.Vector3(0.35, 0.25, 1));
  }
  if (want('backgrounds')) await backgrounds();

  status.textContent = `Done: ${saved} sprites written to public/assets/sprites/${OUT_PREFIX}`;
  (window as unknown as { __studio: unknown }).__studio = { done: true, saved, manifest };
}

main().catch((e) => {
  status.textContent = 'Error: ' + e.message;
  (window as unknown as { __studio: unknown }).__studio = { done: true, error: String(e), saved };
  console.error(e);
});
