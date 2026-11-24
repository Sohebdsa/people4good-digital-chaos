import * as THREE from 'three';
import type { PowerId } from '../../data/types';
import { box, cyl, sph, mesh, mat, glow, basic, texMat, planeGeo, torGeo, coneGeo, octGeo, formTex, screenTex, labelTex } from './kit';
import { bakeStatic } from './bake';

type Builder = (g: THREE.Group) => void;

const WHITE = 0xffffff;
const INK = 0x1d2433;

const toolBuilders: Record<string, Builder> = {
  digital_form(g) {
    // tablet showing a digital form
    box(0.42, 0.56, 0.05, mat(INK), 0, 0, 0, g);
    mesh(planeGeo(0.36, 0.48), texMat(formTex('form', '#2bb3a3'), { emissive: true }), 0, 0, 0.027, g);
    mesh(planeGeo(0.36, 0.48), texMat(formTex('form', '#2bb3a3'), { emissive: true }), 0, 0, -0.027, g).rotation.y = Math.PI;
    sph(0.05, glow(0x7bf1a8, 1), 0.16, 0.25, 0.04, g, 6, 5);
  },
  database(g) {
    for (let i = 0; i < 3; i++) {
      cyl(0.22, 0.22, 0.13, glow(0x3a86ff, 0.35), 0, -0.17 + i * 0.17, 0, g, 14);
      cyl(0.225, 0.225, 0.025, mat(0xdbe9ff), 0, -0.1 + i * 0.17, 0, g, 14);
    }
    sph(0.04, glow(0x7bf1a8, 1.2), 0.15, 0.2, 0.15, g, 6, 5);
  },
  cloud(g) {
    const m = glow(0x7cc6fe, 0.35);
    sph(0.2, m, 0, 0.04, 0, g, 10, 8);
    sph(0.15, m, -0.2, -0.03, 0, g, 10, 8);
    sph(0.16, m, 0.2, -0.02, 0, g, 10, 8);
    sph(0.13, m, 0.08, 0.16, 0, g, 10, 8);
    box(0.5, 0.12, 0.2, m, 0, -0.1, 0, g);
    // lock badge = access control
    box(0.12, 0.1, 0.05, mat(0xffb627), 0, -0.07, 0.15, g);
    mesh(torGeo(0.04, 0.012, 4, 8, Math.PI), mat(0xffb627), 0, -0.02, 0.15, g);
  },
  dashboard(g) {
    box(0.6, 0.42, 0.04, mat(0x0f1f3a), 0, 0, 0, g);
    mesh(planeGeo(0.56, 0.38), texMat(screenTex('dash'), { emissive: true }), 0, 0, 0.022, g);
    mesh(planeGeo(0.56, 0.38), texMat(screenTex('dash'), { emissive: true }), 0, 0, -0.022, g).rotation.y = Math.PI;
    for (let i = 0; i < 3; i++) box(0.08, 0.1 + i * 0.08, 0.08, glow(0xffb627, 0.6), -0.18 + i * 0.18, -0.36 + (0.1 + i * 0.08) / 2, 0, g);
  },
  ai_assistant(g) {
    // friendly round bot
    const head = sph(0.24, mat(0xf3eaff, { rough: 0.35 }), 0, 0.05, 0, g, 14, 10);
    head.scale.set(1.1, 0.95, 1);
    box(0.34, 0.16, 0.05, mat(0x2d1e4f), 0, 0.06, 0.21, g);
    sph(0.035, glow(0x5ef2ff, 1.5), -0.07, 0.07, 0.24, g, 6, 5);
    sph(0.035, glow(0x5ef2ff, 1.5), 0.07, 0.07, 0.24, g, 6, 5);
    cyl(0.01, 0.01, 0.14, mat(INK), 0, 0.32, 0, g, 4);
    sph(0.04, glow(0x9b5de5, 1.2), 0, 0.4, 0, g, 6, 5);
    const ring = mesh(torGeo(0.32, 0.018, 4, 20), glow(0x9b5de5, 0.8), 0, -0.05, 0, g);
    ring.rotation.x = Math.PI / 2 - 0.3;
  },
  ai_research(g) {
    // illuminated notebook
    const l = box(0.28, 0.38, 0.03, mat(0x5a189a), -0.14, 0, 0, g);
    l.rotation.y = 0.3;
    const r = box(0.28, 0.38, 0.03, mat(0x5a189a), 0.14, 0, 0, g);
    r.rotation.y = -0.3;
    mesh(planeGeo(0.24, 0.34), texMat(formTex('doc', '#c77dff'), { emissive: true }), -0.13, 0, 0.06, g).rotation.y = 0.3;
    mesh(planeGeo(0.24, 0.34), texMat(formTex('doc', '#c77dff'), { emissive: true }), 0.13, 0, 0.06, g).rotation.y = -0.3;
    sph(0.06, glow(0xffd166, 1.5), 0, 0.3, 0.05, g, 8, 6);
  },
  ai_design(g) {
    box(0.5, 0.4, 0.04, mat(0xffffff), 0, 0, 0, g);
    box(0.18, 0.18, 0.02, mat(0xff6f91), -0.12, 0.06, 0.025, g);
    sph(0.07, mat(0x2bb3a3), 0.12, 0.08, 0.03, g, 8, 6);
    box(0.36, 0.05, 0.02, mat(0xffb627), 0, -0.12, 0.025, g);
    const brush = cyl(0.02, 0.02, 0.36, mat(0x8d5a3b), 0.24, -0.05, 0.08, g, 5);
    brush.rotation.z = -0.6;
    sph(0.035, glow(0xff6f91, 1.2), 0.35, 0.1, 0.08, g, 6, 5);
  },
  automation(g) {
    // interlocking gears
    const gear = (r: number, x: number, y: number, color: number, name: string) => {
      const gg = new THREE.Group();
      gg.position.set(x, y, 0);
      gg.name = name;
      g.add(gg);
      cyl(r, r, 0.08, glow(color, 0.3), 0, 0, 0, gg, 12).rotation.x = Math.PI / 2;
      const n = Math.round(r * 40);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const t = box(0.06, 0.06, 0.08, mat(color), Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), 0, gg);
        t.rotation.z = a;
      }
      cyl(r * 0.35, r * 0.35, 0.1, mat(WHITE), 0, 0, 0, gg, 8).rotation.x = Math.PI / 2;
      return gg;
    };
    gear(0.18, -0.1, 0.06, 0xf3722c, 'gearA');
    gear(0.12, 0.17, -0.12, 0xffb627, 'gearB');
  },
  privacy_shield(g) {
    const s = new THREE.Shape();
    s.moveTo(0, 0.3);
    s.quadraticCurveTo(0.2, 0.25, 0.26, 0.24);
    s.quadraticCurveTo(0.26, -0.12, 0, -0.32);
    s.quadraticCurveTo(-0.26, -0.12, -0.26, 0.24);
    s.quadraticCurveTo(-0.2, 0.25, 0, 0.3);
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
    geom.translate(0, 0, -0.04);
    mesh(geom, glow(0x1fb5a8, 0.45), 0, 0, 0, g);
    // keyhole
    sph(0.05, mat(WHITE), 0, 0.04, 0.07, g, 8, 6);
    box(0.04, 0.1, 0.02, mat(WHITE), 0, -0.04, 0.07, g);
  },
  consent(g) {
    box(0.4, 0.52, 0.02, mat(0xfffdf6), 0, 0, 0, g);
    mesh(planeGeo(0.38, 0.5), texMat(formTex('form', '#90be6d')), 0, 0, 0.012, g);
    // check mark
    const a = box(0.06, 0.16, 0.03, glow(0x2b9348, 0.6), -0.05, -0.12, 0.03, g);
    a.rotation.z = 0.7;
    const b = box(0.06, 0.3, 0.03, glow(0x2b9348, 0.6), 0.06, -0.06, 0.03, g);
    b.rotation.z = -0.6;
  },
  strong_password(g) {
    const m = glow(0xffd166, 0.6);
    const bow = mesh(torGeo(0.13, 0.045, 6, 14), m, -0.2, 0, 0, g);
    bow.rotation.y = 0;
    cyl(0.035, 0.035, 0.45, m, 0.08, 0, 0, g, 8).rotation.z = Math.PI / 2;
    box(0.05, 0.12, 0.04, m, 0.25, -0.07, 0, g);
    box(0.05, 0.08, 0.04, m, 0.16, -0.05, 0, g);
    mesh(octGeo(0.05), glow(0x5ef2ff, 1.2), -0.2, 0, 0, g);
  },
  human_review(g) {
    // rubber stamp
    cyl(0.22, 0.24, 0.08, mat(0xe76f51), 0, -0.2, 0, g, 12);
    cyl(0.07, 0.09, 0.22, mat(0x6d3b2a), 0, -0.04, 0, g, 8);
    sph(0.13, mat(0x8d4b35), 0, 0.15, 0, g, 10, 8);
    // stamped mark with person icon
    sph(0.04, glow(0xffffff, 0.8), 0, -0.24, 0.22, g, 6, 5);
    mesh(planeGeo(0.32, 0.14), texMat(labelTex('REVIEWED', '#e76f51', '#ffffff', 220, 80, 34)), 0, 0.02, 0.15, g);
  },
  ai_policy(g) {
    box(0.42, 0.54, 0.04, mat(0xf7f3e8), 0, 0, 0, g);
    mesh(planeGeo(0.4, 0.5), texMat(formTex('doc', '#577590')), 0, 0, 0.022, g);
    mesh(planeGeo(0.4, 0.5), texMat(formTex('doc', '#577590')), 0, 0, -0.022, g).rotation.y = Math.PI;
    // official seal
    cyl(0.08, 0.08, 0.03, glow(0xffb627, 0.6), 0.12, -0.17, 0.035, g, 12).rotation.x = Math.PI / 2;
    // ribbon
    box(0.04, 0.12, 0.01, mat(0xe63946), 0.09, -0.27, 0.04, g).rotation.z = 0.3;
    box(0.04, 0.12, 0.01, mat(0xe63946), 0.15, -0.27, 0.04, g).rotation.z = -0.3;
  },
  backup_vault(g) {
    box(0.44, 0.44, 0.36, mat(0x4d908e, { metal: 0.4, rough: 0.4 }), 0, 0, 0, g);
    cyl(0.14, 0.14, 0.04, mat(0xd0d6e0, { metal: 0.7, rough: 0.2 }), 0, 0, 0.19, g, 12).rotation.x = Math.PI / 2;
    const arrow = mesh(torGeo(0.09, 0.02, 4, 12, Math.PI * 1.5), glow(0x7bf1a8, 1.0), 0, 0, 0.22, g);
    arrow.rotation.z = 0.5;
    for (const x of [-0.15, 0.15]) box(0.05, 0.05, 0.05, mat(0x2f5d5b), x, -0.25, 0.1, g);
  },
  roadmap(g) {
    box(0.6, 0.42, 0.03, mat(0x0f1f3a), 0, 0, 0, g);
    mesh(planeGeo(0.56, 0.38), texMat(screenTex('map'), { emissive: true }), 0, 0, 0.017, g);
    mesh(planeGeo(0.56, 0.38), texMat(screenTex('map'), { emissive: true }), 0, 0, -0.017, g).rotation.y = Math.PI;
    const pin = mesh(coneGeo(0.06, 0.14, 8), glow(0xffc93c, 1.0), 0.22, 0.25, 0.05, g);
    pin.rotation.x = Math.PI;
    sph(0.06, glow(0xffc93c, 1.0), 0.22, 0.33, 0.05, g, 8, 6);
  },
};

export function buildTool(id: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `tool:${id}`;
  const inner = new THREE.Group();
  inner.name = 'spin';
  g.add(inner);
  (toolBuilders[id] ?? toolBuilders.digital_form)(inner);
  inner.scale.setScalar(1.15);
  // soft ground ring for readability
  const ring = mesh(torGeo(0.34, 0.03, 4, 20), basic(0xffffff, 0.35), 0, -0.85, 0, g);
  ring.rotation.x = Math.PI / 2;
  ring.name = 'ring';
  return bakeStatic(g) as THREE.Group;
}

// ---------------- power-ups ----------------
const powerBuilders: Record<PowerId, Builder> = {
  shield(g) {
    toolBuilders.privacy_shield(g);
  },
  boost(g) {
    // lightning bolt + AI spark
    const s = new THREE.Shape();
    s.moveTo(0.05, 0.32);
    s.lineTo(-0.16, -0.02);
    s.lineTo(0, -0.02);
    s.lineTo(-0.06, -0.32);
    s.lineTo(0.17, 0.06);
    s.lineTo(0.02, 0.06);
    s.lineTo(0.05, 0.32);
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    geom.translate(0, 0, -0.04);
    mesh(geom, glow(0xc77dff, 0.9), 0, 0, 0, g);
    mesh(planeGeo(0.26, 0.16), texMat(labelTex('x2', '#9b5de5', '#ffffff', 96, 64, 44)), 0.2, 0.24, 0.05, g);
  },
  automation(g) {
    toolBuilders.automation(g);
  },
  magnet(g) {
    const m = mesh(torGeo(0.2, 0.08, 6, 14, Math.PI), mat(0x3a86ff), 0, 0.02, 0, g);
    m.rotation.z = Math.PI;
    box(0.16, 0.12, 0.16, mat(0xffffff), -0.2, 0.08, 0, g);
    box(0.16, 0.12, 0.16, mat(0xffffff), 0.2, 0.08, 0, g);
    for (let i = 0; i < 3; i++) box(0.07, 0.07, 0.07, glow(0x7cc6fe, 1), -0.12 + i * 0.12, 0.3 + (i % 2) * 0.05, 0, g);
  },
  backup(g) {
    toolBuilders.backup_vault(g);
  },
  oversight(g) {
    // eye inside human silhouette = human in the loop
    sph(0.12, mat(0xffe0cc), 0, 0.18, 0, g, 10, 8);
    cyl(0.12, 0.2, 0.26, mat(0xe76f51), 0, -0.08, 0, g, 10);
    const lens = mesh(torGeo(0.1, 0.025, 5, 14), mat(0x1d2433), 0.16, 0.12, 0.12, g);
    lens.rotation.y = 0.4;
    cyl(0.018, 0.018, 0.14, mat(0x1d2433), 0.24, 0.0, 0.14, g, 4).rotation.z = 0.6;
    sph(0.04, glow(0x5ef2ff, 1.2), 0.16, 0.12, 0.12, g, 6, 5);
  },
};

export function buildPower(id: PowerId, color: number): THREE.Group {
  const g = new THREE.Group();
  g.name = `power:${id}`;
  const inner = new THREE.Group();
  inner.name = 'spin';
  g.add(inner);
  powerBuilders[id](inner);
  inner.scale.setScalar(1.25);
  const bubble = sph(0.55, basic(color, 0.16), 0, 0, 0, g, 16, 12);
  bubble.name = 'bubble';
  const r1 = mesh(torGeo(0.6, 0.03, 4, 28), glow(color, 1.2), 0, 0, 0, g);
  r1.name = 'orbit';
  const ring = mesh(torGeo(0.4, 0.04, 4, 20), basic(color, 0.5), 0, -0.85, 0, g);
  ring.rotation.x = Math.PI / 2;
  ring.name = 'ring';
  return bakeStatic(g) as THREE.Group;
}

// ---------------- decision gate ----------------
export function buildGate(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'decision-gate';
  const stone = mat(0xf4efe2);
  const teal = glow(0x1fb5a8, 0.5);
  for (const x of [-4.1, 4.1]) {
    box(0.8, 5.4, 0.8, stone, x, 2.7, 0, g);
    box(1.0, 0.3, 1.0, mat(0x1fb5a8), x, 0.15, 0, g);
    box(1.0, 0.3, 1.0, mat(0x1fb5a8), x, 5.3, 0, g);
    box(0.1, 4.2, 0.82, teal, x + (x > 0 ? -0.36 : 0.36), 2.8, 0, g);
  }
  box(9.0, 0.7, 0.9, stone, 0, 5.75, 0, g);
  mesh(planeGeo(5.4, 0.62), texMat(labelTex('DECISION GATE', '#14213d', '#ffc93c', 512, 64, 44)), 0, 5.75, 0.46, g);
  // shimmering curtain
  const curtain = mesh(planeGeo(7.4, 5.0), basic(0x5ef2ff, 0.14), 0, 2.9, 0, g);
  curtain.name = 'curtain';
  const sym = mesh(torGeo(0.7, 0.07, 6, 24), glow(0xffc93c, 1.0), 0, 3.0, 0.05, g);
  sym.name = 'sym';
  const q = mesh(planeGeo(0.9, 0.9), texMat(labelTex('?', 'rgba(0,0,0,0)', '#ffc93c', 128, 128, 110), { transparent: true }), 0, 3.0, 0.06, g);
  q.name = 'q';
  return bakeStatic(g) as THREE.Group;
}

