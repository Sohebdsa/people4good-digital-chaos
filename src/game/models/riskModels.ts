import * as THREE from 'three';
import type { RiskShape } from '../../data/types';
import {
  box, cyl, sph, mesh, mat, glow, basic, texMat, planeGeo, torGeo, coneGeo, octGeo,
  sheetTex, formTex, screenTex, cardTex, labelTex, mulberry,
} from './kit';
import { bakeStatic } from './bake';

/** Collision volumes per shape (centered on lane x, z). y0 = bottom. */
export const SHAPE_BOX: Record<RiskShape, { w: number; h: number; d: number; y0: number }> = {
  low: { w: 1.6, h: 0.85, d: 0.9, y0: 0 },
  high: { w: 1.9, h: 1.8, d: 0.6, y0: 1.2 },
  wall: { w: 1.8, h: 2.8, d: 1.0, y0: 0 },
};

const PAPER = 0xfaf6ea;
const KRAFT = 0xc49a6c;
const STEEL = 0x8792a8;
const DARK = 0x2a2f45;
const DANGER = 0xe63946;
const AMBER = 0xffb627;

type Builder = (g: THREE.Group) => void;

/** A soft hazard stripe under each risk helps readability at speed. */
function hazardBase(g: THREE.Group, w: number, color = DANGER) {
  const m = mesh(planeGeo(w, 0.9), basic(color, 0.28), 0, 0.03, 0, g);
  m.rotation.x = -Math.PI / 2;
}

function hoverPads(g: THREE.Group, color: number) {
  // little glowing hover emitters that "hold up" floating overhead risks
  for (const x of [-0.75, 0.75]) {
    const p = cyl(0.12, 0.05, 0.08, glow(color, 1.2), x, 1.13, 0, g, 8);
    p.rotation.x = Math.PI;
    const beam = cyl(0.02, 0.09, 1.1, basic(color, 0.18), x, 0.56, 0, g, 6);
    beam.name = 'beam';
  }
}

const builders: Record<string, Builder> = {
  // 1. paper forms pile (low)
  paper_forms(g) {
    hazardBase(g, 1.7, AMBER);
    const rnd = mulberry(1);
    for (let s = 0; s < 3; s++) {
      const x = -0.5 + s * 0.5;
      const h = 0.45 + rnd() * 0.35;
      for (let i = 0; i < 5; i++) {
        const sheet = box(0.5, h / 5, 0.62, mat(i % 2 ? PAPER : 0xf1e7cf), x + (rnd() - 0.5) * 0.08, (i + 0.5) * (h / 5), (rnd() - 0.5) * 0.1, g);
        sheet.rotation.y = (rnd() - 0.5) * 0.4;
      }
      const top = mesh(planeGeo(0.48, 0.62), texMat(formTex('form', '#d9822b')), x, h + 0.005, 0, g);
      top.rotation.x = -Math.PI / 2;
      top.rotation.z = (rnd() - 0.5) * 0.4;
    }
    // bound register
    const reg = box(0.55, 0.12, 0.4, mat(0x7a2e2e), 0.1, 0.9, 0.05, g);
    reg.rotation.z = 0.25;
    for (let i = 0; i < 4; i++) {
      const f = mesh(planeGeo(0.3, 0.4), texMat(formTex('form', '#d9822b')), -0.6 + i * 0.4, 0.05 + (i % 2) * 0.03, 0.45, g);
      f.rotation.x = -Math.PI / 2;
      f.rotation.z = i;
    }
  },
  // 2. scattered sheets (high, floating panels)
  scattered_sheets(g) {
    hoverPads(g, 0x2e8b57);
    const rnd = mulberry(2);
    for (let i = 0; i < 4; i++) {
      const p = mesh(planeGeo(0.8, 0.8), texMat(sheetTex(i), { emissive: true }), -0.6 + i * 0.42, 1.95 + (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.3, g);
      p.rotation.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.5);
      p.userData.bob = i;
    }
    // broken link symbols
    for (const x of [-0.35, 0.35]) {
      const l = mesh(torGeo(0.09, 0.025, 5, 10), mat(DANGER), x, 2.55, 0.1, g);
      l.rotation.y = 0.6;
    }
  },
  // 3. duplicates wall
  duplicates(g) {
    hazardBase(g, 1.9);
    const t = texMat(cardTex(true));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const card = new THREE.Group();
        card.position.set(-0.56 + c * 0.56 + (r % 2) * 0.05, 0.36 + r * 0.66, 0);
        card.rotation.z = (((r * 3 + c) % 3) - 1) * 0.05;
        g.add(card);
        box(0.54, 0.6, 0.1, mat(0xfefefe), 0, 0, 0, card);
        const face = mesh(planeGeo(0.5, 0.33), t, 0, 0, -0.051, card);
        face.rotation.y = Math.PI;
        face.rotation.y = 0;
        face.position.z = 0.051;
        const face2 = mesh(planeGeo(0.5, 0.33), t, 0, 0, -0.051, card);
        face2.rotation.y = Math.PI;
      }
    }
    // "DUPLICATE" tag
    mesh(planeGeo(1.4, 0.36), texMat(labelTex('DUPLICATE x3', '#e63946', '#ffffff', 320, 82, 38)), 0, 2.95, 0.07, g);
  },
  // 4. missing info (low) – incomplete giant form lying tilted
  missing_info(g) {
    hazardBase(g, 1.7, AMBER);
    const board = new THREE.Group();
    board.position.y = 0.42;
    board.rotation.x = -0.35;
    g.add(board);
    box(1.4, 0.8, 0.08, mat(0x6b4f36), 0, 0, 0, board);
    mesh(planeGeo(1.25, 0.7), texMat(formTex('form', '#3a86ff')), 0, 0, 0.045, board);
    mesh(planeGeo(1.25, 0.7), texMat(formTex('form', '#3a86ff')), 0, 0, -0.045, board).rotation.y = Math.PI;
    // floating question marks
    for (const x of [-0.45, 0.1, 0.5]) {
      const q = mesh(planeGeo(0.28, 0.28), texMat(labelTex('?', '#e63946', '#ffffff', 64, 64, 48)), x, 0.95 + Math.abs(x) * 0.2, 0, g);
      q.userData.bob = x * 5;
    }
    box(0.3, 0.06, 0.3, mat(0xd8cfc0), 0.55, 0.03, 0.3, g);
  },
  // 5. no central DB (wall) – disconnected cylinders
  no_central_db(g) {
    hazardBase(g, 1.9);
    const cols = [0x3a86ff, 0x7cc6fe, 0x577590];
    [-0.55, 0, 0.55].forEach((x, i) => {
      const h = 1.6 + i * 0.5;
      const stack = new THREE.Group();
      stack.position.set(x, 0, (i - 1) * 0.12);
      stack.rotation.z = (i - 1) * 0.06;
      g.add(stack);
      const n = Math.round(h / 0.45);
      for (let k = 0; k < n; k++) {
        cyl(0.27, 0.27, 0.36, mat(cols[i]), 0, 0.2 + k * 0.45, 0, stack, 12);
        cyl(0.275, 0.275, 0.06, mat(0xe9f2ff), 0, 0.41 + k * 0.45, 0, stack, 12);
      }
    });
    // broken cable bits
    for (const x of [-0.28, 0.28]) {
      const c = cyl(0.03, 0.03, 0.4, mat(DANGER), x, 1.4, -0.2, g, 5);
      c.rotation.z = Math.PI / 2 + (x > 0 ? 0.3 : -0.3);
      sph(0.06, glow(AMBER, 1.0), x + (x > 0 ? 0.2 : -0.2), 1.45, -0.2, g, 6, 5);
    }
  },
  // 6. manual reports (high) – banner of report pages + calculators
  manual_reports(g) {
    hoverPads(g, AMBER);
    const bar = cyl(0.05, 0.05, 1.9, mat(0x5b4636), 0, 2.85, 0, g, 6);
    bar.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const p = mesh(planeGeo(0.36, 0.5), texMat(formTex('report', '#5a7bd8')), -0.76 + i * 0.38, 2.5, 0, g);
      p.rotation.z = (i % 2 ? 1 : -1) * 0.06;
      p.userData.bob = i * 1.3;
    }
    for (const x of [-0.55, 0.55]) {
      const calc = new THREE.Group();
      calc.position.set(x, 1.6, 0);
      calc.rotation.z = x > 0 ? -0.2 : 0.2;
      g.add(calc);
      box(0.36, 0.46, 0.1, mat(0x3c3f58), 0, 0, 0, calc);
      box(0.28, 0.1, 0.02, glow(0x9bf6a0, 0.6), 0, 0.14, 0.055, calc);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box(0.06, 0.05, 0.02, mat(0xe9e9e9), -0.08 + c * 0.08, 0.01 - r * 0.08, 0.055, calc);
    }
  },
  // 7. no backup (low) – crumbling drive
  no_backup(g) {
    hazardBase(g, 1.6, AMBER);
    const drive = new THREE.Group();
    drive.position.y = 0.3;
    drive.rotation.set(0.1, 0.25, -0.12);
    g.add(drive);
    box(1.1, 0.4, 0.7, mat(0x4a4e69), 0, 0, 0, drive);
    box(1.0, 0.05, 0.6, mat(0x9a8c98), 0, 0.22, 0, drive);
    box(0.08, 0.06, 0.02, glow(DANGER, 1.3), 0.42, 0.05, 0.36, drive);
    // crack + falling chunks
    box(0.04, 0.42, 0.72, mat(0x1b1b2a), 0.1, 0, 0, drive).rotation.z = 0.3;
    const rnd = mulberry(7);
    for (let i = 0; i < 7; i++) {
      const c = mesh(octGeo(0.06 + rnd() * 0.06), mat(0x4a4e69), (rnd() - 0.5) * 1.3, 0.06 + rnd() * 0.7, (rnd() - 0.5) * 0.6, g);
      c.userData.bob = i;
    }
  },
  // 8. public AI upload (wall) – giant prompt window
  public_ai_upload(g) {
    hazardBase(g, 1.9);
    const frame = new THREE.Group();
    frame.position.y = 1.45;
    g.add(frame);
    box(1.85, 2.0, 0.16, mat(0x3c2f6b), 0, 0, 0, frame);
    box(1.85, 0.18, 0.18, mat(0x8f7bff), 0, 0.92, 0, frame);
    for (let i = 0; i < 3; i++) sph(0.04, mat([DANGER, AMBER, 0x2bb3a3][i]), -0.78 + i * 0.12, 0.92, 0.1, frame, 6, 5);
    const scr = mesh(planeGeo(1.7, 1.6), texMat(screenTex('prompt'), { emissive: true }), 0, -0.07, -0.085, frame);
    scr.rotation.y = Math.PI;
    mesh(planeGeo(1.7, 1.6), texMat(screenTex('prompt'), { emissive: true }), 0, -0.07, 0.085, frame);
    // ID documents sliding in
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Group();
      d.position.set(-0.6 + i * 0.6, 2.75 + (i % 2) * 0.2, 0);
      d.rotation.z = (i - 1) * 0.3;
      d.userData.bob = i * 2;
      g.add(d);
      box(0.4, 0.28, 0.03, mat(0xfefefe), 0, 0, 0, d);
      box(0.12, 0.14, 0.035, mat(0xc9d6df), -0.1, 0, 0, d);
      box(0.14, 0.03, 0.035, mat(DANGER), 0.08, 0.05, 0, d);
    }
  },
  // 9. no privacy policy (high) – blank document banner
  no_privacy_policy(g) {
    hoverPads(g, 0x8f9bff);
    const doc = mesh(planeGeo(1.4, 1.6), texMat(formTex('blank', '#577590')), 0, 2.15, 0, g);
    doc.userData.bob = 0;
    const back = mesh(planeGeo(1.4, 1.6), texMat(formTex('blank', '#577590')), 0, 2.15, 0.01, g);
    back.rotation.y = Math.PI;
    box(1.5, 0.08, 0.08, mat(STEEL), 0, 2.98, 0, g);
    // empty-state marker
    const ring = mesh(torGeo(0.18, 0.04, 6, 16), mat(DANGER), 0.55, 2.75, 0.05, g);
    box(0.36, 0.05, 0.05, mat(DANGER), 0.55, 2.75, 0.06, g).rotation.z = -0.8;
    ring.rotation.z = 0;
  },
  // 10. no consent (low) – slab with unsigned consent form
  no_consent(g) {
    hazardBase(g, 1.6, AMBER);
    const slab = new THREE.Group();
    slab.position.y = 0.4;
    slab.rotation.x = -0.25;
    g.add(slab);
    box(1.0, 0.78, 0.1, mat(0x5c677d), 0, 0, 0, slab);
    mesh(planeGeo(0.58, 0.74), texMat(formTex('consent', '#90be6d')), 0, 0, -0.055, slab).rotation.y = Math.PI;
    mesh(planeGeo(0.58, 0.74), texMat(formTex('consent', '#90be6d')), 0, 0, 0.055, slab);
    // unused pen lying beside
    const pen = cyl(0.03, 0.03, 0.5, mat(0x1d3557), 0.62, 0.05, 0.2, g, 6);
    pen.rotation.z = Math.PI / 2;
    pen.rotation.y = 0.5;
    const nib = mesh(coneGeo(0.03, 0.08, 6), mat(AMBER), 0.88, 0.05, 0.34, g);
    nib.rotation.z = -Math.PI / 2;
  },
  // 11. weak passwords (wall) – cracked padlock
  weak_passwords(g) {
    hazardBase(g, 1.9);
    const lock = new THREE.Group();
    lock.position.y = 0;
    g.add(lock);
    box(1.5, 1.4, 0.6, mat(0xb8860b, { metal: 0.6, rough: 0.35 }), 0, 0.7, 0, lock);
    const shackle = mesh(torGeo(0.5, 0.11, 6, 14, Math.PI), mat(0xaeb8c4, { metal: 0.8, rough: 0.3 }), 0.12, 1.4, 0, lock);
    shackle.rotation.z = 0.25;
    // crack
    const crack = new THREE.Group();
    crack.position.set(0.05, 0.75, 0.31);
    lock.add(crack);
    box(0.06, 0.5, 0.02, mat(0x1b1b1b), 0, 0.15, 0, crack).rotation.z = 0.4;
    box(0.06, 0.4, 0.02, mat(0x1b1b1b), 0.1, -0.2, 0, crack).rotation.z = -0.5;
    // weak password label
    mesh(planeGeo(1.2, 0.34), texMat(labelTex('password123', '#1d1d2b', '#ff4d6d', 320, 90, 40)), 0, 0.35, -0.31, lock).rotation.y = Math.PI;
    mesh(planeGeo(1.2, 0.34), texMat(labelTex('password123', '#1d1d2b', '#ff4d6d', 320, 90, 40)), 0, 0.35, 0.31, lock);
    // keyhole
    cyl(0.08, 0.08, 0.02, mat(0x1b1b1b), -0.35, 0.95, 0.31, lock, 8).rotation.x = Math.PI / 2;
    // extend for wall height
    box(0.18, 0.9, 0.18, mat(0x8a6a1a), -0.6, 1.85, 0, lock);
    box(0.18, 0.9, 0.18, mat(0x8a6a1a), 0.6, 1.85, 0, lock);
  },
  // 12. shared logins (low) – one big key, many holders
  shared_logins(g) {
    hazardBase(g, 1.7, AMBER);
    const key = new THREE.Group();
    key.position.y = 0.42;
    g.add(key);
    const bow = mesh(torGeo(0.22, 0.07, 6, 14), mat(AMBER, { metal: 0.6, rough: 0.35 }), -0.6, 0, 0, key);
    bow.rotation.y = Math.PI / 2;
    cyl(0.06, 0.06, 1.1, mat(AMBER, { metal: 0.6, rough: 0.35 }), 0.05, 0, 0, key, 8).rotation.z = Math.PI / 2;
    box(0.08, 0.2, 0.06, mat(AMBER, { metal: 0.6, rough: 0.35 }), 0.45, -0.12, 0, key);
    box(0.08, 0.14, 0.06, mat(AMBER, { metal: 0.6, rough: 0.35 }), 0.3, -0.09, 0, key);
    // little figures holding the key
    const cols = [0x3a86ff, 0xe76f51, 0x2bb3a3, 0x9b5de5];
    cols.forEach((c, i) => {
      const x = -0.35 + i * 0.25;
      const f = new THREE.Group();
      f.position.set(x, 0, i % 2 ? 0.22 : -0.22);
      g.add(f);
      cyl(0.07, 0.09, 0.3, mat(c), 0, 0.15, 0, f, 6);
      sph(0.07, mat(0xc68b59), 0, 0.37, 0, f, 6, 5);
      box(0.04, 0.2, 0.04, mat(c), 0, 0.33, i % 2 ? -0.1 : 0.1, f).rotation.x = i % 2 ? 0.6 : -0.6;
    });
  },
  // 13. unauthorised access (wall) – open vault
  unauthorised_access(g) {
    hazardBase(g, 1.9);
    box(1.8, 2.7, 0.5, mat(0x56607a, { metal: 0.5, rough: 0.4 }), 0, 1.35, 0.1, g);
    cyl(0.75, 0.75, 0.05, mat(0x1b2033), 0, 1.4, 0.36, g, 16).rotation.x = Math.PI / 2;
    // door swung open toward player
    const door = new THREE.Group();
    door.position.set(-0.78, 1.4, 0.4);
    door.rotation.y = -1.1;
    g.add(door);
    const disk = cyl(0.74, 0.74, 0.18, mat(0x9aa5b8, { metal: 0.7, rough: 0.3 }), 0.74, 0, 0, door, 16);
    disk.rotation.x = Math.PI / 2;
    const wheel = mesh(torGeo(0.26, 0.04, 5, 12), mat(0xd0d6e0, { metal: 0.8, rough: 0.2 }), 0.74, 0, 0.12, door);
    wheel.userData.spin = 1;
    // spilling data cubes
    const rnd = mulberry(13);
    for (let i = 0; i < 6; i++) {
      const c = box(0.16, 0.16, 0.16, glow(i % 2 ? 0x5ef2ff : AMBER, 0.8), (rnd() - 0.5) * 1, 1.0 + rnd() * 0.8, 0.5 + rnd() * 0.3, g);
      c.userData.bob = i;
    }
    mesh(planeGeo(1.2, 0.3), texMat(labelTex('ACCESS: EVERYONE', '#ffb627', '#1d1d2b', 360, 80, 32)), 0, 2.45, 0.36, g);
  },
  // 14. no retention policy (wall) – endless archive boxes
  no_retention(g) {
    hazardBase(g, 1.9);
    const rnd = mulberry(14);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 3; c++) {
        const b = box(0.56, 0.44, 0.6, mat(r % 2 ? KRAFT : 0xb5895c), -0.58 + c * 0.58 + (rnd() - 0.5) * 0.08, 0.22 + r * 0.46, (rnd() - 0.5) * 0.1, g);
        b.rotation.y = (rnd() - 0.5) * 0.2;
        box(0.2, 0.08, 0.01, mat(PAPER), b.position.x, b.position.y + 0.05, b.position.z + 0.305, g);
      }
    }
    mesh(planeGeo(1.1, 0.3), texMat(labelTex('KEEP FOREVER?', '#e63946', '#ffffff', 320, 86, 36)), 0, 2.95, 0.36, g);
  },
  // 15. public links (high) – exposed folder + globe
  public_links(g) {
    hoverPads(g, 0x5ef2ff);
    const folder = new THREE.Group();
    folder.position.y = 2.1;
    folder.rotation.x = 0.2;
    g.add(folder);
    box(1.4, 0.95, 0.12, mat(0xf4a261), 0, 0, 0, folder);
    box(0.5, 0.16, 0.12, mat(0xf4a261), -0.45, 0.54, 0, folder);
    box(1.3, 0.8, 0.04, mat(PAPER), 0, 0.12, 0.06, folder).rotation.x = 0.3;
    const globe = sph(0.3, glow(0x3a86ff, 0.4), 0.55, 2.75, -0.1, g, 10, 8);
    globe.userData.spin = 1;
    const ring = mesh(torGeo(0.33, 0.025, 4, 18), mat(0xffffff), 0.55, 2.75, -0.1, g);
    ring.rotation.x = Math.PI / 2;
    const ring2 = mesh(torGeo(0.33, 0.025, 4, 18), mat(0xffffff), 0.55, 2.75, -0.1, g);
    ring2.rotation.y = Math.PI / 2;
    mesh(planeGeo(0.9, 0.26), texMat(labelTex('anyone with link', '#ffffff', '#e63946', 300, 80, 30)), -0.2, 1.55, 0.1, g);
  },
  // 16. copy-paste AI (low) – conveyor of identical docs
  copy_paste_ai(g) {
    hazardBase(g, 1.7, AMBER);
    box(1.6, 0.3, 0.75, mat(0x3c3f58), 0, 0.15, 0, g);
    for (const x of [-0.7, 0.7]) cyl(0.12, 0.12, 0.78, mat(0x8d99ae), x, 0.32, 0, g, 8).rotation.x = Math.PI / 2;
    box(1.5, 0.03, 0.7, mat(0x22223b), 0, 0.31, 0, g);
    for (let i = 0; i < 5; i++) {
      const d = mesh(planeGeo(0.26, 0.36), texMat(formTex('doc', '#9b5de5')), -0.6 + i * 0.3, 0.33, 0, g);
      d.rotation.x = -Math.PI / 2;
      d.userData.slide = i;
    }
    // copy machine head
    box(0.5, 0.45, 0.8, mat(0x9b5de5), -0.55, 0.72, 0, g);
    box(0.3, 0.06, 0.02, glow(0x5ef2ff, 1.0), -0.55, 0.82, 0.41, g);
    mesh(planeGeo(0.5, 0.18), texMat(labelTex('Ctrl+C Ctrl+V', '#1d1d2b', '#5ef2ff', 256, 80, 30)), -0.55, 0.62, 0.41, g);
  },
  // 17. hallucination (wall) – glitch screen
  hallucination(g) {
    hazardBase(g, 1.9);
    box(0.25, 0.5, 0.25, mat(DARK), 0, 0.25, 0, g);
    const scr = new THREE.Group();
    scr.position.y = 1.55;
    g.add(scr);
    box(1.85, 1.9, 0.18, mat(0x241b3a), 0, 0, 0, scr);
    const s1 = mesh(planeGeo(1.7, 1.7), texMat(screenTex('glitch'), { emissive: true }), 0, 0, -0.095, scr);
    s1.rotation.y = Math.PI;
    mesh(planeGeo(1.7, 1.7), texMat(screenTex('glitch'), { emissive: true }), 0, 0, 0.095, scr);
    scr.userData.glitch = 1;
    // floating wrong numbers
    for (let i = 0; i < 3; i++) {
      const n = mesh(planeGeo(0.5, 0.25), texMat(labelTex(['99.9%', '+500%', '1M'][i], '#ff4d6d', '#ffffff', 160, 80, 40)), -0.6 + i * 0.6, 2.75, 0.12, g);
      n.userData.bob = i * 2;
    }
  },
  // 18. no AI guidelines (high) – unguided drone
  no_ai_guidelines(g) {
    const drone = new THREE.Group();
    drone.position.y = 2.05;
    drone.userData.bob = 1;
    g.add(drone);
    const core = sph(0.42, mat(0xe0e1f5, { rough: 0.3 }), 0, 0, 0, drone, 14, 10);
    core.scale.set(1.25, 0.75, 1);
    box(0.5, 0.14, 0.05, glow(0xff4d6d, 1.3), 0, 0.02, 0.4, drone);
    for (const [x, z] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) {
      cyl(0.03, 0.03, 0.5, mat(DARK), x / 2, 0, z / 2, drone, 5).rotation.z = Math.PI / 2;
      const rotor = cyl(0.22, 0.22, 0.02, basic(0xffffff, 0.45), x, 0.12, z, drone, 12);
      rotor.userData.spin = 3;
      cyl(0.04, 0.04, 0.12, mat(DARK), x, 0.06, z, drone, 6);
    }
    // dangling empty instruction tag
    cyl(0.01, 0.01, 0.4, mat(DARK), 0, -0.42, 0, drone, 4);
    mesh(planeGeo(0.5, 0.3), texMat(labelTex('rules: none', '#ffffff', '#e63946', 200, 110, 34)), 0, -0.75, 0, drone);
    // warning beam
    const beam = cyl(0.05, 0.6, 0.9, basic(0xff4d6d, 0.12), 0, 1.3, 0, g, 10);
    beam.name = 'beam';
  },
  // 19. AI bias (low) – unbalanced scale (low profile)
  ai_bias(g) {
    hazardBase(g, 1.7, AMBER);
    cyl(0.5, 0.6, 0.12, mat(0x3c3f58), 0, 0.06, 0, g, 10);
    cyl(0.06, 0.06, 0.55, mat(0xc9a227, { metal: 0.6, rough: 0.35 }), 0, 0.38, 0, g, 6);
    const beam = new THREE.Group();
    beam.position.y = 0.66;
    beam.rotation.z = 0.32;
    g.add(beam);
    box(1.5, 0.06, 0.08, mat(0xc9a227, { metal: 0.6, rough: 0.35 }), 0, 0, 0, beam);
    for (const x of [-0.7, 0.7]) {
      cyl(0.008, 0.008, 0.2, mat(DARK), x, -0.1, 0, beam, 4);
      cyl(0.26, 0.18, 0.06, mat(0xc9a227, { metal: 0.6, rough: 0.35 }), x, -0.22, 0, beam, 10);
    }
    // heavy weight on one side, tiny on other
    box(0.26, 0.24, 0.26, mat(0x5a189a), -0.7, -0.05, 0, beam);
    sph(0.05, mat(0x2bb3a3), 0.7, -0.15, 0, beam, 6, 5);
    sph(0.05, glow(0x9b5de5, 0.8), 0, 0.1, 0, beam, 6, 5);
  },
  // 20. no human verification (high) – autonomous barrier arm
  no_human_review(g) {
    hoverPads(g, 0x9b5de5);
    const arm = new THREE.Group();
    arm.position.y = 1.65;
    g.add(arm);
    for (let i = 0; i < 8; i++) box(0.24, 0.2, 0.14, mat(i % 2 ? 0xffffff : DANGER), -0.84 + i * 0.24, 0, 0, arm);
    // AI eye unit on top
    const unit = new THREE.Group();
    unit.position.set(0, 0.45, 0);
    arm.add(unit);
    box(0.7, 0.5, 0.4, mat(0x2d1e4f), 0, 0, 0, unit);
    const eye = sph(0.14, glow(0xff4d6d, 1.4), 0, 0, 0.18, unit, 10, 8);
    eye.userData.pulse = 1;
    mesh(planeGeo(0.9, 0.24), texMat(labelTex('AUTO-REJECT', '#ff4d6d', '#ffffff', 300, 80, 34)), 0, 0.5, 0.05, unit);
    // empty human seat marker
    const seat = mesh(torGeo(0.12, 0.03, 5, 12), mat(0xffffff), 0.75, 0.45, 0, arm);
    seat.rotation.y = Math.PI / 2;
  },
};

export function buildRisk(id: string, shape: RiskShape): THREE.Group {
  const g = new THREE.Group();
  g.name = `risk:${id}`;
  const b = builders[id];
  if (b) b(g);
  else box(SHAPE_BOX[shape].w, SHAPE_BOX[shape].h, SHAPE_BOX[shape].d, mat(0xff00ff), 0, SHAPE_BOX[shape].y0 + SHAPE_BOX[shape].h / 2, 0, g);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name !== 'beam') o.castShadow = true;
  });
  return bakeStatic(g) as THREE.Group;
}

/** Per-frame idle animation for risk models (cheap: only touches tagged children). */
export function animateRisk(g: THREE.Group, t: number) {
  for (const c of g.children) {
    const u = c.userData;
    if (u.bob !== undefined) {
      if (u.baseY === undefined) u.baseY = c.position.y;
      c.position.y = u.baseY + Math.sin(t * 2.2 + u.bob) * 0.08;
    }
    if (u.spin) c.rotation.y += 0.016 * u.spin * 4;
    if (u.pulse) c.scale.setScalar(1 + Math.sin(t * 8) * 0.12);
    if (u.glitch) c.position.x = Math.sin(t * 37) > 0.93 ? 0.05 : 0;
    if (u.slide !== undefined) c.position.x = -0.75 + ((t * 0.6 + u.slide * 0.3) % 1.5);
    if (c.children.length) {
      for (const cc of c.children) if (cc.userData.spin) cc.rotation.y += 0.05 * cc.userData.spin;
    }
  }
}
