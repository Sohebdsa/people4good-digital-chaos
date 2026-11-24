import * as THREE from 'three';
import type { EnvId } from '../../data/types';
import { box, cyl, sph, mesh, mat, glow, basic, texMat, planeGeo, torGeo, coneGeo, icoGeo, sheetTex, formTex, screenTex, labelTex, mulberry } from './kit';
import { bakeStatic, animNodes } from './bake';

type Builder = (g: THREE.Group, rnd: () => number) => void;

// ---------------- Manual Maze ----------------
const maze: Builder[] = [
  // filing cabinet cluster
  (g, rnd) => {
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const h = 1.6 + rnd() * 1.6;
      const cab = new THREE.Group();
      cab.position.set(i * 1.05, 0, rnd() * 0.4);
      cab.rotation.y = (rnd() - 0.5) * 0.2;
      g.add(cab);
      box(1, h, 0.9, mat(i % 2 ? 0x7d8b8c : 0x96a3a0), 0, h / 2, 0, cab);
      const drawers = Math.floor(h / 0.55);
      for (let d = 0; d < drawers; d++) {
        const open = rnd() > 0.75;
        box(0.86, 0.44, 0.06, mat(0x6b7778), 0, 0.3 + d * 0.55, open ? 0.6 : 0.47, cab);
        box(0.2, 0.05, 0.05, mat(0xd8d2c2), 0, 0.38 + d * 0.55, open ? 0.65 : 0.52, cab);
        if (open) box(0.75, 0.12, 0.3, mat(0xfaf6ea), 0, 0.5 + d * 0.55, 0.55, cab);
      }
    }
  },
  // paper skyscraper
  (g, rnd) => {
    const h = 4 + rnd() * 5;
    let y = 0;
    while (y < h) {
      const t = 0.18 + rnd() * 0.25;
      const s = box(1.6 - y * 0.04, t, 2 - y * 0.04, mat(rnd() > 0.5 ? 0xfaf6ea : 0xefe3c8), (rnd() - 0.5) * 0.18, y + t / 2, (rnd() - 0.5) * 0.18, g);
      s.rotation.y = (rnd() - 0.5) * 0.18;
      y += t;
    }
    // bound with string
    box(0.05, h, 0.05, mat(0x8b5a2b), 0.82, h / 2, 0, g);
  },
  // office desk with old monitor + papers
  (g, rnd) => {
    box(2, 0.1, 1, mat(0x8a5a3b), 0, 0.85, 0, g);
    for (const [x, z] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) box(0.08, 0.85, 0.08, mat(0x5e3b25), x, 0.42, z, g);
    box(0.6, 0.5, 0.5, mat(0xd9d4c5), -0.4, 1.15, 0, g);
    box(0.46, 0.34, 0.02, glow(0x6fae7c, 0.4), -0.4, 1.18, 0.26, g);
    for (let i = 0; i < 4; i++) {
      const p = box(0.45, 0.04 + i * 0.03, 0.6, mat(0xfaf6ea), 0.5, 0.92 + i * 0.03, 0, g);
      p.rotation.y = rnd() * 0.5;
    }
    const chair = box(0.6, 0.08, 0.6, mat(0x3d405b), 0, 0.5, 0.9, g);
    chair.rotation.y = rnd();
    box(0.6, 0.7, 0.08, mat(0x3d405b), 0, 0.85, 1.18, g);
  },
  // wall of giant binders (maze walls)
  (g, rnd) => {
    const cols = [0xc0392b, 0x2980b9, 0x27ae60, 0xd68910, 0x8e44ad, 0x7f8c8d];
    for (let i = 0; i < 6; i++) {
      const h = 2.2 + rnd() * 0.8;
      const b = box(0.45, h, 1.6, mat(cols[Math.floor(rnd() * cols.length)]), 0, h / 2, i * 0.0, g);
      b.position.z = 0;
      b.position.x = i * 0.47;
      b.rotation.z = (rnd() - 0.5) * 0.06;
      box(0.46, 0.4, 0.5, mat(0xfaf6ea), i * 0.47, h * 0.7, 0.4, g);
      mesh(torGeo(0.1, 0.03, 4, 8), mat(0xbcbcbc), i * 0.47, h * 0.35, 0.81, g);
    }
  },
  // scattered floating sheets + register stack
  (g, rnd) => {
    for (let i = 0; i < 5; i++) {
      const s = mesh(planeGeo(0.5, 0.7), texMat(formTex('form', '#d9822b')), (rnd() - 0.5) * 2, 1 + rnd() * 3, (rnd() - 0.5) * 2, g);
      s.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      s.userData.float = rnd() * 6;
    }
    for (let i = 0; i < 6; i++) box(0.9, 0.15, 1.2, mat(i % 2 ? 0x7a2e2e : 0x2e4a7a), 0, 0.08 + i * 0.16, 0, g).rotation.y = rnd() * 0.3;
  },
];

// ---------------- Spreadsheet City ----------------
const sheets: Builder[] = [
  // spreadsheet tower
  (g, rnd) => {
    const h = 5 + rnd() * 7;
    const w = 2 + rnd();
    box(w, h, w, mat(0xf4fbf6), 0, h / 2, 0, g);
    const t = texMat(sheetTex(Math.floor(rnd() * 4)), { emissive: true });
    for (let y = 0; y < h - 1; y += 2.2) {
      mesh(planeGeo(w * 0.9, 2), t, 0, 1.1 + y, w / 2 + 0.01, g);
      const side = mesh(planeGeo(w * 0.9, 2), t, w / 2 + 0.01, 1.1 + y, 0, g);
      side.rotation.y = Math.PI / 2;
      const side2 = mesh(planeGeo(w * 0.9, 2), t, -w / 2 - 0.01, 1.1 + y, 0, g);
      side2.rotation.y = -Math.PI / 2;
    }
    box(w + 0.2, 0.3, w + 0.2, mat(0x1e7d4f), 0, h + 0.15, 0, g);
  },
  // floating grid panels
  (g, rnd) => {
    for (let i = 0; i < 3; i++) {
      const p = mesh(planeGeo(2, 2), texMat(sheetTex(i + 2), { emissive: true }), (rnd() - 0.5) * 2, 2 + i * 1.6, (rnd() - 0.5), g);
      p.rotation.y = (rnd() - 0.5) * 1.2;
      p.userData.float = i * 2;
    }
    cyl(0.1, 0.1, 6, mat(0x2e8b57), 0, 3, -0.5, g, 6);
  },
  // duplicate data blocks
  (g, rnd) => {
    const c = [0x2e8b57, 0x52b788, 0x95d5b2];
    for (let i = 0; i < 9; i++) {
      const s = 0.6 + rnd() * 0.6;
      box(s, s, s, mat(c[i % 3]), (rnd() - 0.5) * 2.5, s / 2 + Math.floor(i / 3) * 0.9, (rnd() - 0.5) * 2, g).rotation.y = rnd();
    }
  },
  // giant folder building
  (g, rnd) => {
    const h = 3 + rnd() * 3;
    box(3, h, 1.5, mat(0xf4c26b), 0, h / 2, 0, g);
    box(1.2, 0.5, 1.5, mat(0xf4c26b), -0.9, h + 0.25, 0, g);
    for (let i = 0; i < 3; i++) box(2.6, 0.08, 0.02, mat(0xffffff), 0, 0.8 + i * 0.9, 0.76, g);
    mesh(planeGeo(1.8, 0.5), texMat(labelTex('final_v7_REAL.xlsx', '#ffffff', '#1e7d4f', 384, 90, 34)), 0, h * 0.75, 0.77, g);
  },
  // column of cells (database-ish but disconnected)
  (g, rnd) => {
    const n = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < n; i++) {
      box(1.2, 0.5, 1.2, mat(i % 2 ? 0xe9f2ec : 0xcfe8d6), 0, 0.25 + i * 0.55, 0, g);
      box(1.22, 0.05, 1.22, mat(0x1e7d4f), 0, 0.5 + i * 0.55, 0, g);
    }
    if (rnd() > 0.5) box(1.25, 0.5, 1.25, glow(0xff8fa3, 0.3), 0, 0.25 + Math.floor(n / 2) * 0.55, 0, g);
  },
];

// ---------------- Data Security District ----------------
const security: Builder[] = [
  // vault tower
  (g, rnd) => {
    const h = 6 + rnd() * 8;
    box(3, h, 3, mat(0x2b2f55), 0, h / 2, 0, g);
    for (let y = 1; y < h - 1; y += 1.3)
      for (let x = -1; x <= 1; x += 1) if (rnd() > 0.35) box(0.5, 0.6, 0.05, glow(rnd() > 0.8 ? 0xffb627 : 0x6a78d1, 0.9), x, y, 1.53, g);
    box(3.2, 0.4, 3.2, mat(0x3a4170), 0, h + 0.2, 0, g);
    const beacon = sph(0.2, glow(0xff4d6d, 2), 0, h + 0.6, 0, g, 6, 5);
    beacon.userData.blink = rnd() * 5;
  },
  // firewall segment
  (g, rnd) => {
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 4; c++) box(0.9, 0.45, 0.6, mat(r % 2 ? 0x6b2737 : 0x7d2e3e), c * 0.95 + (r % 2) * 0.45, 0.25 + r * 0.48, 0, g);
    for (let i = 0; i < 5; i++) {
      const f = mesh(coneGeo(0.25, 0.8 + rnd() * 0.5, 5), glow(0xff7a45, 1.6), rnd() * 3.5, 2.7, 0, g);
      f.userData.flicker = rnd() * 5;
    }
  },
  // security gate pylon with scanner
  (g) => {
    box(0.6, 4, 0.6, mat(0x3a4170), 0, 2, 0, g);
    box(0.8, 0.3, 0.8, mat(0xffb627), 0, 4.1, 0, g);
    const scan = mesh(planeGeo(0.05, 3.4), basic(0x5ef2ff, 0.7), 0.31, 2, 0, g);
    scan.rotation.y = Math.PI / 2;
    scan.userData.scan = 1;
    for (let i = 0; i < 6; i++) box(0.62, 0.08, 0.62, mat(i % 2 ? 0x1d1d2b : 0xffb627), 0, 0.3 + i * 0.1, 0, g);
  },
  // padlock monument
  (g) => {
    box(1.8, 1.5, 0.8, mat(0x56607a, { metal: 0.6, rough: 0.35 }), 0, 1.6, 0, g);
    const sh = mesh(torGeo(0.6, 0.14, 6, 14, Math.PI), mat(0xaeb8c4, { metal: 0.8, rough: 0.25 }), 0, 2.35, 0, g);
    sh.rotation.z = 0;
    box(2.2, 0.85, 1.2, mat(0x2b2f55), 0, 0.42, 0, g);
    cyl(0.12, 0.12, 0.05, glow(0x7bf1a8, 1.2), 0, 1.7, 0.41, g, 10).rotation.x = Math.PI / 2;
  },
  // server racks
  (g, rnd) => {
    for (let i = 0; i < 3; i++) {
      box(0.9, 2.4, 1, mat(0x15172b), i * 1, 1.2, 0, g);
      for (let k = 0; k < 8; k++) {
        box(0.7, 0.04, 0.02, glow(rnd() > 0.7 ? 0xffb627 : 0x5ef2ff, 1.2), i * 1, 0.4 + k * 0.25, 0.51, g).userData.blink = rnd() * 6;
      }
    }
  },
];

// ---------------- AI Frontier ----------------
const ai: Builder[] = [
  // futuristic tapered tower with rings
  (g, rnd) => {
    const h = 7 + rnd() * 9;
    cyl(0.6, 1.6, h, mat(0x3b2a63, { rough: 0.35, metal: 0.3 }), 0, h / 2, 0, g, 8);
    for (let y = 2; y < h; y += 2.2) {
      const r = mesh(torGeo(1.6 - (y / h) * 1.0 + 0.2, 0.06, 4, 20), glow(rnd() > 0.5 ? 0x5ef2ff : 0xc77dff, 1.3), 0, y, 0, g);
      r.rotation.x = Math.PI / 2;
    }
    sph(0.35, glow(0xffc6a8, 1.4), 0, h + 0.3, 0, g, 8, 6);
  },
  // AI processing core
  (g, rnd) => {
    box(2, 0.6, 2, mat(0x2c1f4a), 0, 0.3, 0, g);
    const core = mesh(icoGeo(0.9, 0), glow(0x9b5de5, 0.7), 0, 2.4, 0, g);
    core.userData.spinY = 0.6;
    for (let i = 0; i < 2; i++) {
      const r = mesh(torGeo(1.4 + i * 0.3, 0.04, 4, 28), glow(0x5ef2ff, 1.2), 0, 2.4, 0, g);
      r.rotation.set(rnd() * 3, rnd() * 3, 0);
      r.userData.spinX = 0.4 + i * 0.3;
    }
  },
  // data visualisation installation (light bars)
  (g, rnd) => {
    for (let i = 0; i < 6; i++) {
      const h = 0.8 + rnd() * 3.5;
      const bar = box(0.5, h, 0.5, glow(i % 2 ? 0x5ef2ff : 0xc77dff, 0.7), i * 0.65, h / 2, 0, g);
      bar.userData.eq = i;
      bar.userData.h = h;
    }
    box(4.2, 0.15, 1, mat(0x24163a), 1.6, 0.07, 0, g);
  },
  // assistant drone hovering over pad
  (g) => {
    cyl(1, 1.1, 0.2, mat(0x24163a), 0, 0.1, 0, g, 12);
    mesh(torGeo(0.8, 0.04, 4, 20), glow(0x5ef2ff, 1), 0, 0.22, 0, g).rotation.x = Math.PI / 2;
    const bot = new THREE.Group();
    bot.position.y = 2.2;
    bot.userData.float = 1;
    g.add(bot);
    sph(0.5, mat(0xf3eaff, { rough: 0.3 }), 0, 0, 0, bot, 14, 10);
    box(0.7, 0.3, 0.1, mat(0x2d1e4f), 0, 0.05, 0.45, bot);
    sph(0.07, glow(0x5ef2ff, 1.5), -0.15, 0.06, 0.51, bot, 6, 5);
    sph(0.07, glow(0x5ef2ff, 1.5), 0.15, 0.06, 0.51, bot, 6, 5);
  },
  // automation pathway arch
  (g, rnd) => {
    const arc = mesh(torGeo(2.2, 0.18, 6, 24, Math.PI), mat(0x4b3a78), 0, 0, 0, g);
    arc.rotation.y = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 5) * Math.PI;
      const p = sph(0.14, glow(0xffc6a8, 1.4), 0, Math.sin(a) * 2.2, Math.cos(a) * 2.2, g, 6, 5);
      p.userData.blink = i + rnd();
    }
  },
];

// ---------------- Responsible Innovation City ----------------
const city: Builder[] = [
  // modern NGO office
  (g, rnd) => {
    const h = 4 + rnd() * 6;
    const w = 3 + rnd() * 1.5;
    box(w, h, 3, mat(0xf4efe2), 0, h / 2, 0, g);
    for (let y = 1; y < h - 0.6; y += 1.3) {
      box(w - 0.4, 0.75, 0.05, glow(0x9fe3dc, 0.25), 0, y, 1.52, g);
      box(w + 0.1, 0.1, 3.1, mat(0x1fb5a8), 0, y + 0.55, 0, g);
    }
    // solar panels
    for (let i = 0; i < 3; i++) {
      const p = box(0.8, 0.05, 1, mat(0x274c77, { metal: 0.5, rough: 0.3 }), -w / 3 + i * (w / 3), h + 0.3, 0, g);
      p.rotation.x = -0.4;
    }
    // green roof
    sph(0.35, mat(0x55a630), w / 2 - 0.4, h + 0.2, 1, g, 6, 5);
  },
  // low-poly tree
  (g, rnd) => {
    const s = 0.8 + rnd() * 0.6;
    cyl(0.12 * s, 0.18 * s, 1.4 * s, mat(0x7f5539), 0, 0.7 * s, 0, g, 6);
    mesh(icoGeo(0.9 * s, 0), mat(rnd() > 0.5 ? 0x55a630 : 0x80b918), 0, 1.9 * s, 0, g);
    mesh(icoGeo(0.6 * s, 0), mat(0x2b9348), 0.3 * s, 2.5 * s, 0.1, g);
  },
  // dashboard billboard
  (g) => {
    cyl(0.12, 0.12, 3, mat(0x9aa5b1), 0, 1.5, 0, g, 6);
    box(3.2, 2, 0.2, mat(0x14213d), 0, 3.6, 0, g);
    mesh(planeGeo(3, 1.8), texMat(screenTex('dash'), { emissive: true }), 0, 3.6, 0.11, g);
  },
  // collaborative workspace / community centre with people
  (g, rnd) => {
    box(4, 2.6, 3, mat(0xfff3d6), 0, 1.3, 0, g);
    const roof = mesh(coneGeo(3, 1.4, 4), mat(0xe76f51), 0, 3.3, 0, g);
    roof.rotation.y = Math.PI / 4;
    box(1, 1.6, 0.05, mat(0x1fb5a8), 0, 0.8, 1.52, g);
    box(1, 0.7, 0.05, glow(0xffe8a3, 0.4), -1.3, 1.6, 1.52, g);
    box(1, 0.7, 0.05, glow(0xffe8a3, 0.4), 1.3, 1.6, 1.52, g);
    const cols = [0x3a86ff, 0xe76f51, 0x2bb3a3, 0x9b5de5, 0xffb627];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Group();
      f.position.set(-1 + i * 1, 0, 2.2 + rnd() * 0.4);
      g.add(f);
      cyl(0.16, 0.2, 0.7, mat(cols[(i + Math.floor(rnd() * 5)) % 5]), 0, 0.35, 0, f, 6);
      sph(0.15, mat([0x8d5a3b, 0xc68b59, 0xf1c27d][i]), 0, 0.85, 0, f, 7, 6);
    }
  },
  // wind turbine
  (g, rnd) => {
    const h = 6 + rnd() * 3;
    cyl(0.12, 0.25, h, mat(0xffffff), 0, h / 2, 0, g, 8);
    const hub = new THREE.Group();
    hub.position.set(0, h, 0.3);
    hub.userData.rotor = 0.6 + rnd() * 0.6;
    g.add(hub);
    sph(0.2, mat(0xffffff), 0, 0, 0, hub, 8, 6);
    for (let i = 0; i < 3; i++) {
      const b = box(0.18, 2.2, 0.05, mat(0xf4f4f4), 0, 1.1, 0, new THREE.Group());
      const arm = new THREE.Group();
      arm.rotation.z = (i / 3) * Math.PI * 2;
      arm.add(b);
      hub.add(arm);
    }
  },
  // bench + lamp + planter
  (g) => {
    box(1.6, 0.1, 0.5, mat(0x9c6644), 0, 0.5, 0, g);
    box(1.6, 0.4, 0.08, mat(0x9c6644), 0, 0.75, -0.25, g);
    for (const x of [-0.7, 0.7]) box(0.08, 0.5, 0.45, mat(0x495057), x, 0.25, 0, g);
    cyl(0.06, 0.08, 3, mat(0x495057), 1.4, 1.5, 0, g, 6);
    sph(0.22, glow(0xfff3b0, 1.2), 1.4, 3.1, 0, g, 8, 6);
    box(0.8, 0.5, 0.8, mat(0xd4a373), -1.5, 0.25, 0, g);
    mesh(icoGeo(0.45, 0), mat(0x55a630), -1.5, 0.8, 0, g);
  },
];

export const SCENERY: Record<EnvId, Builder[]> = { maze, sheets, security, ai, city };

export function buildScenery(env: EnvId, variant: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = mulberry(seed);
  SCENERY[env][variant % SCENERY[env].length](g, rnd);
  bakeStatic(g);
  return g; // animNodes() is cached lazily per instance (prototypes are cloned)
}

/** Big distant silhouettes for skyline depth. */
export function buildSkyline(env: EnvId, seed: number): THREE.Group {
  const g = new THREE.Group();
  const rnd = mulberry(seed);
  const palette: Record<EnvId, number[]> = {
    maze: [0xb58c62, 0xa47b55, 0xc9a477],
    sheets: [0x8fbfa0, 0x7aa98b, 0xa9d1b5],
    security: [0x2a2f66, 0x252a5a, 0x343a78],
    ai: [0x6b4a8c, 0x7a5699, 0x5c3e7d],
    city: [0xa9d6e5, 0xc3e3ee, 0x9ccbd9],
  };
  const cols = palette[env];
  for (let i = 0; i < 4; i++) {
    const h = 8 + rnd() * 18;
    const w = 3 + rnd() * 5;
    const shape = env === 'ai' ? cyl(w * 0.3, w * 0.5, h, mat(cols[i % 3]), i * 6, h / 2, rnd() * 4, g, 6) : box(w, h, w, mat(cols[i % 3]), i * 6, h / 2, rnd() * 4, g);
    if (env === 'security' || env === 'ai') {
      for (let k = 0; k < 4; k++) box(w * 0.2, 0.3, 0.05, glow(env === 'ai' ? 0x5ef2ff : 0xffb627, 0.8), shape.position.x + (rnd() - 0.5) * w * 0.5, 2 + rnd() * (h - 3), shape.position.z + w / 2 + 0.03, g);
    }
  }
  return bakeStatic(g) as THREE.Group;
}

/** Animate tagged scenery children (list cached at build time; no per-frame tree walk). */
export function animateScenery(g: THREE.Group, t: number) {
  const nodes = animNodes(g);
  if (!nodes.length) return;
  nodes.forEach((c) => {
    const u = c.userData;
    if (u.float !== undefined) {
      if (u.baseY === undefined) u.baseY = c.position.y;
      c.position.y = u.baseY + Math.sin(t * 1.3 + u.float) * 0.25;
    }
    if (u.spinY) c.rotation.y = t * u.spinY;
    if (u.spinX) c.rotation.x = t * u.spinX;
    if (u.rotor) c.rotation.z = t * u.rotor;
    if (u.blink !== undefined) c.visible = Math.sin(t * 3 + u.blink) > -0.6;
    if (u.flicker !== undefined) c.scale.y = 0.8 + Math.sin(t * 11 + u.flicker) * 0.2;
    if (u.scan) c.position.y = 2 + Math.sin(t * 2) * 1.5;
    if (u.eq !== undefined) c.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 2 + u.eq));
  });
}

