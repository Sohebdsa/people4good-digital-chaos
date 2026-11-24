import * as THREE from 'three';

/** Shared, cached geometries / materials / canvas textures for the procedural low-poly art. */

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();
const texCache = new Map<string, THREE.Texture>();

function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

export function boxGeo(w: number, h: number, d: number) {
  return geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
}
export function cylGeo(rt: number, rb: number, h: number, seg = 10) {
  return geo(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}
export function sphGeo(r: number, w = 10, h = 8) {
  return geo(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
}
export function icoGeo(r: number, detail = 0) {
  return geo(`i${r}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
}
export function torGeo(r: number, t: number, rs = 6, ts = 16, arc = Math.PI * 2) {
  return geo(`t${r}|${t}|${rs}|${ts}|${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
export function coneGeo(r: number, h: number, seg = 8) {
  return geo(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
}
export function planeGeo(w: number, h: number) {
  return geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
}
export function octGeo(r: number) {
  return geo(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));
}

export function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; ei?: number; flat?: boolean; transparent?: number } = {}) {
  const { rough = 0.75, metal = 0.05, emissive = 0, ei = 0, flat = true, transparent } = opts;
  const key = `m${color}|${rough}|${metal}|${emissive}|${ei}|${flat}|${transparent}`;
  let m = matCache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal, flatShading: flat,
      emissive: new THREE.Color(emissive), emissiveIntensity: ei,
      transparent: transparent !== undefined, opacity: transparent ?? 1,
      depthWrite: transparent === undefined,
    });
    matCache.set(key, m);
  }
  return m;
}

export function glow(color: number, ei = 0.8) {
  return mat(color, { emissive: color, ei, rough: 0.4 });
}

export function basic(color: number, opacity?: number) {
  const key = `bas${color}|${opacity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined });
    matCache.set(key, m);
  }
  return m;
}

export function texMat(tex: THREE.Texture, opts: { emissive?: boolean; transparent?: boolean } = {}) {
  const key = `tm${tex.uuid}|${opts.emissive}|${opts.transparent}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.8, metalness: 0,
      emissive: opts.emissive ? new THREE.Color(0xffffff) : new THREE.Color(0), emissiveMap: opts.emissive ? tex : null,
      emissiveIntensity: opts.emissive ? 0.55 : 0, transparent: !!opts.transparent, side: THREE.DoubleSide,
    });
    matCache.set(key, m);
  }
  return m;
}

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  if (parent) parent.add(me);
  return me;
}

export function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
  return mesh(boxGeo(w, h, d), m, x, y, z, parent);
}

export function cyl(rt: number, rb: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D, seg = 10) {
  return mesh(cylGeo(rt, rb, h, seg), m, x, y, z, parent);
}

export function sph(r: number, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D, w = 10, h = 8) {
  return mesh(sphGeo(r, w, h), m, x, y, z, parent);
}

// ---------------- canvas textures ----------------
function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  let t = texCache.get(key);
  if (!t) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d')!;
    draw(c);
    const ct = new THREE.CanvasTexture(cv);
    ct.colorSpace = THREE.SRGBColorSpace;
    ct.anisotropy = 4;
    t = ct;
    texCache.set(key, t);
  }
  return t;
}

const FONT = '"Fredoka", "Trebuchet MS", system-ui, sans-serif';

export function labelTex(text: string, bg: string, fg: string, w = 256, h = 96, size = 40) {
  return canvasTex(`lbl${text}|${bg}|${fg}|${w}|${h}|${size}`, w, h, (c) => {
    c.fillStyle = bg;
    roundRect(c, 4, 4, w - 8, h - 8, 18);
    c.fill();
    c.fillStyle = fg;
    c.font = `700 ${size}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((ln, i) => c.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
  });
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function sheetTex(variant = 0) {
  return canvasTex(`sheet${variant}`, 256, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#1e7d4f';
    c.fillRect(0, 0, 256, 26);
    c.fillStyle = '#e3f1e8';
    c.fillRect(0, 26, 28, 230);
    c.strokeStyle = '#9cc9ae';
    c.lineWidth = 2;
    for (let x = 28; x <= 256; x += 46) { c.beginPath(); c.moveTo(x, 26); c.lineTo(x, 256); c.stroke(); }
    for (let y = 26; y <= 256; y += 23) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    const rnd = mulberry(variant + 3);
    for (let r = 0; r < 9; r++) {
      for (let col = 0; col < 5; col++) {
        const v = rnd();
        if (v < 0.18) { c.fillStyle = '#ffd6d6'; c.fillRect(30 + col * 46, 28 + r * 23, 42, 19); continue; }
        c.fillStyle = v > 0.85 ? '#2b6cb0' : '#355e47';
        c.fillRect(34 + col * 46, 36 + r * 23, 12 + rnd() * 24, 5);
      }
    }
  });
}

export function formTex(kind: 'form' | 'consent' | 'policy' | 'report' | 'doc' | 'blank', accent = '#e76f51') {
  return canvasTex(`form${kind}${accent}`, 192, 256, (c) => {
    c.fillStyle = kind === 'blank' ? '#fbfaf5' : '#fffdf6';
    c.fillRect(0, 0, 192, 256);
    c.fillStyle = accent;
    c.fillRect(0, 0, 192, 30);
    c.fillStyle = '#ffffff';
    c.font = `700 18px ${FONT}`;
    c.textAlign = 'center';
    const title = { form: 'REGISTRATION', consent: 'CONSENT', policy: 'PRIVACY POLICY', report: 'MONTHLY REPORT', doc: 'DOCUMENT', blank: 'POLICY' }[kind];
    c.fillText(title, 96, 22);
    c.strokeStyle = '#c9c2b0';
    c.lineWidth = 2;
    const rnd = mulberry(kind.length * 7);
    if (kind === 'blank' || kind === 'policy') {
      c.fillStyle = '#d8d2c2';
      c.font = `600 15px ${FONT}`;
      c.fillText('(intentionally empty)', 96, 140);
      return;
    }
    for (let i = 0; i < 8; i++) {
      const y = 50 + i * 24;
      c.fillStyle = '#7a7466';
      c.fillRect(14, y, 46, 6);
      c.beginPath();
      c.moveTo(70, y + 8);
      c.lineTo(178, y + 8);
      c.stroke();
      if (kind === 'report') { c.fillStyle = '#5a7bd8'; c.fillRect(72, y - 2, 20 + rnd() * 80, 8); }
      else if (rnd() > 0.45) { c.fillStyle = '#3c3a33'; c.fillRect(72, y - 1, 30 + rnd() * 70, 6); }
      else { c.fillStyle = '#e63946'; c.font = `700 14px ${FONT}`; c.fillText('?', 120, y + 6); }
    }
    if (kind === 'consent') {
      c.strokeStyle = '#e63946';
      c.setLineDash([6, 5]);
      c.strokeRect(20, 220, 152, 26);
      c.setLineDash([]);
      c.fillStyle = '#e63946';
      c.font = `700 12px ${FONT}`;
      c.fillText('SIGNATURE MISSING', 96, 238);
    }
  });
}

export function screenTex(kind: 'prompt' | 'glitch' | 'dash' | 'code' | 'map', accent = '#5ef2ff') {
  return canvasTex(`scr${kind}${accent}`, 256, 192, (c) => {
    c.fillStyle = kind === 'dash' || kind === 'map' ? '#0f1f3a' : '#141029';
    c.fillRect(0, 0, 256, 192);
    c.font = `700 16px ${FONT}`;
    if (kind === 'prompt') {
      c.fillStyle = '#ffffff';
      c.fillRect(14, 14, 228, 120);
      c.fillStyle = '#e63946';
      for (let i = 0; i < 4; i++) {
        c.fillRect(24, 26 + i * 26, 18, 18);
        c.fillStyle = '#4a4a5a';
        c.fillRect(50, 30 + i * 26, 120 + (i % 2) * 40, 8);
        c.fillStyle = '#e63946';
      }
      c.fillStyle = '#8f7bff';
      c.fillRect(14, 146, 180, 32);
      c.fillStyle = '#fff';
      c.fillText('Upload all data?', 104, 168);
      c.fillStyle = accent;
      c.beginPath();
      c.arc(222, 162, 16, 0, Math.PI * 2);
      c.fill();
    } else if (kind === 'glitch') {
      const rnd = mulberry(11);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = i % 3 === 0 ? '#ff4d6d' : '#5ef2ff';
        const h = 20 + rnd() * 120;
        c.fillRect(20 + i * 25, 170 - h, 16, h);
      }
      c.fillStyle = '#ffffff';
      c.font = `700 30px ${FONT}`;
      c.fillText('312%', 60, 46);
      c.fillStyle = '#ff4d6d';
      c.font = `700 14px ${FONT}`;
      c.fillText('source: ???', 150, 40);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = 'rgba(255,77,109,0.35)';
        c.fillRect(0, rnd() * 192, 256, 3 + rnd() * 6);
      }
    } else if (kind === 'dash') {
      c.fillStyle = '#1fb5a8';
      for (let i = 0; i < 6; i++) c.fillRect(18 + i * 26, 150 - (30 + i * 14), 18, 30 + i * 14);
      c.strokeStyle = '#ffb627';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(18, 120);
      c.lineTo(80, 90);
      c.lineTo(130, 100);
      c.lineTo(180, 50);
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(215, 70, 28, 0, Math.PI * 1.4);
      c.lineTo(215, 70);
      c.fill();
    } else if (kind === 'code') {
      const rnd = mulberry(5);
      for (let i = 0; i < 10; i++) {
        c.fillStyle = i % 4 === 0 ? accent : '#8f7bff';
        c.fillRect(16 + (i % 3) * 12, 14 + i * 17, 60 + rnd() * 140, 7);
      }
    } else {
      c.strokeStyle = '#ffc93c';
      c.lineWidth = 6;
      c.setLineDash([12, 8]);
      c.beginPath();
      c.moveTo(20, 160);
      c.bezierCurveTo(80, 40, 150, 180, 236, 30);
      c.stroke();
      c.setLineDash([]);
      [[20, 160], [100, 110], [170, 120], [236, 30]].forEach(([x, y], i) => {
        c.fillStyle = i === 3 ? '#1fb5a8' : '#ffffff';
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.fill();
      });
    }
  });
}

export function cardTex(dup = true) {
  return canvasTex(`card${dup}`, 256, 160, (c) => {
    c.fillStyle = '#fefefe';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#ff9f1c';
    c.fillRect(0, 0, 256, 28);
    c.fillStyle = '#fff';
    c.font = `700 16px ${FONT}`;
    c.fillText('BENEFICIARY', 12, 20);
    c.fillStyle = '#c9d6df';
    c.beginPath();
    c.arc(52, 88, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#90a4b4';
    c.beginPath();
    c.arc(52, 78, 12, 0, Math.PI * 2);
    c.fill();
    c.fillRect(34, 96, 36, 18);
    c.fillStyle = '#3c3a33';
    c.fillRect(100, 56, 120, 10);
    c.fillRect(100, 78, 90, 8);
    c.fillRect(100, 96, 110, 8);
    if (dup) {
      c.fillStyle = '#e63946';
      c.font = `700 22px ${FONT}`;
      c.fillText('ID: ???', 100, 140);
    }
  });
}

export function mulberry(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function setShadows(obj: THREE.Object3D, cast: boolean, receive = false) {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

/** Every canvas texture created so far (for GPU upload during prewarm). */
export function allTextures(): THREE.Texture[] {
  return [...texCache.values()];
}
