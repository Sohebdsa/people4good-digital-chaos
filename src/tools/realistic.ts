/**
 * "Realistic" look for the Sprite Studio: the same procedural models, rendered like a product shot.
 *  - smooth (creased) normals instead of faceted flat shading
 *  - physically based materials per surface family: painted plastic (clearcoat), brushed metal,
 *    paper/cardboard (fibre grain), screens/glass (gloss) — each with procedural micro-surface detail
 *  - every opaque mesh casts and receives soft shadows (contact shadow via a shadow-catcher plane)
 * No external textures or AI imagery: all detail maps are generated on a canvas here.
 */
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 2) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.NoColorSpace; // data map
  t.anisotropy = 8;
  return t;
}

function rand(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Soft multi-octave value noise: fine surface irregularities for paint and plastic. */
const grainTex = canvasTexture(256, (c, s) => {
  const r = rand(7);
  // octaves: coarse noise upscaled with smoothing, then finer layers blended on top
  for (const [res, alpha] of [[16, 1], [48, 0.5], [128, 0.3], [256, 0.2]] as const) {
    const small = document.createElement('canvas');
    small.width = small.height = res;
    const sc = small.getContext('2d')!;
    const img = sc.createImageData(res, res);
    for (let i = 0; i < res * res; i++) {
      const v = Math.round(90 + r() * 80);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    c.globalAlpha = alpha;
    c.imageSmoothingEnabled = true;
    c.drawImage(small, 0, 0, s, s);
  }
  c.globalAlpha = 1;
}, 3);

/** Directional streaks: brushed metal. */
const brushedTex = canvasTexture(256, (c, s) => {
  c.fillStyle = '#808080';
  c.fillRect(0, 0, s, s);
  const r = rand(11);
  for (let i = 0; i < 900; i++) {
    const y = r() * s;
    const v = Math.round(90 + r() * 90);
    c.strokeStyle = `rgba(${v},${v},${v},0.35)`;
    c.lineWidth = 0.5 + r();
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(s, y + (r() - 0.5) * 2);
    c.stroke();
  }
}, 2);

/** Paper / cardboard fibres. */
const fibreTex = canvasTexture(256, (c, s) => {
  c.fillStyle = '#8a8a8a';
  c.fillRect(0, 0, s, s);
  const r = rand(23);
  for (let i = 0; i < 2600; i++) {
    const x = r() * s;
    const y = r() * s;
    const a = r() * Math.PI;
    const l = 2 + r() * 7;
    const v = Math.round(100 + r() * 70);
    c.strokeStyle = `rgba(${v},${v},${v},0.5)`;
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
}, 2);

const matCache = new Map<string, THREE.Material>();
const geoCache = new Map<string, THREE.BufferGeometry>();

function isPaperish(color: THREE.Color) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  // creams, whites, beiges, kraft browns
  return (hsl.l > 0.72 && hsl.s < 0.6) || (hsl.h > 0.05 && hsl.h < 0.13 && hsl.s < 0.55 && hsl.l > 0.35);
}

function convert(m: THREE.Material): THREE.Material {
  const cached = matCache.get(m.uuid);
  if (cached) return cached;
  let out: THREE.Material = m;
  const std = m as THREE.MeshStandardMaterial;
  if (std.isMeshStandardMaterial) {
    const emissive = std.emissiveIntensity > 0;
    const metal = std.metalness >= 0.3;
    const textured = !!std.map;
    const vc = std.vertexColors;
    const paper = textured || (!vc && isPaperish(std.color));
    const p = new THREE.MeshPhysicalMaterial({
      color: std.color.clone(),
      map: std.map,
      vertexColors: vc,
      emissive: std.emissive.clone(),
      emissiveMap: std.emissiveMap,
      emissiveIntensity: emissive ? std.emissiveIntensity * 0.9 : 0,
      transparent: std.transparent,
      opacity: std.opacity,
      side: std.side,
      flatShading: false,
    });
    if (metal) {
      p.metalness = Math.max(0.75, std.metalness);
      p.roughness = 0.3;
      p.roughnessMap = brushedTex;
      p.bumpMap = brushedTex;
      p.bumpScale = 0.15;
    } else if (paper) {
      p.metalness = 0;
      p.roughness = 0.88;
      p.bumpMap = fibreTex;
      p.bumpScale = 0.35;
      p.sheen = 0.25;
      p.sheenRoughness = 0.9;
    } else if (emissive) {
      // screens, LEDs, glass-like glows: glossy coat over the glow
      p.roughness = 0.18;
      p.clearcoat = 0.8;
      p.clearcoatRoughness = 0.08;
    } else {
      // painted / moulded plastic, fabric-ish when very matte
      p.metalness = 0.02;
      p.roughness = 0.42;
      p.roughnessMap = grainTex;
      p.bumpMap = grainTex;
      p.bumpScale = 0.12;
      p.clearcoat = 0.35;
      p.clearcoatRoughness = 0.35;
    }
    out = p;
  }
  matCache.set(m.uuid, out);
  return out;
}

function smooth(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const cached = geoCache.get(g.uuid);
  if (cached) return cached;
  // keep hard edges on boxes (90 deg) but round off cylinders, spheres and bevels
  const s = toCreasedNormals(g, THREE.MathUtils.degToRad(50));
  geoCache.set(g.uuid, s);
  return s;
}

/** Convert a model (in place) to the realistic look. */
export function realify(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    const m = mesh.material as THREE.Material;
    if (Array.isArray(m)) return;
    const isBasic = (m as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    if (!isBasic && mesh.geometry.attributes.normal) mesh.geometry = smooth(mesh.geometry);
    mesh.material = convert(m);
    const translucent = (mesh.material as THREE.Material).transparent || isBasic;
    mesh.castShadow = !translucent;
    mesh.receiveShadow = !translucent;
  });
}
