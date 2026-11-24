import * as THREE from 'three';
import { box, cyl, mat } from './kit';

/**
 * Roadside billboards for the event partners. Each partner logo is drawn onto a white canvas
 * (the logos have dark text, so they need a light panel) with a small "IN PARTNERSHIP WITH" line.
 * MeshBasicMaterial keeps them readable in every environment, including the night-time districts.
 */
export const PARTNERS = [
  { id: 'tech4dev', name: 'Project Tech4Dev', file: 'tech4dev-logo.png' },
  { id: 'infoxchange', name: 'Infoxchange', file: 'infoxchange-logo.png' },
] as const;
export type PartnerId = (typeof PARTNERS)[number]['id'];

const W = 1024;
const H = 512;
const materials = new Map<PartnerId, THREE.MeshBasicMaterial>();

function partnerMaterial(id: PartnerId): THREE.MeshBasicMaterial {
  const cached = materials.get(id);
  if (cached) return cached;
  const partner = PARTNERS.find((p) => p.id === id)!;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  const paint = (img?: HTMLImageElement) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#1fb5a8';
    c.fillRect(0, H - 26, W, 26);
    c.fillStyle = '#5b6478';
    c.font = '600 40px "Inter", system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('IN PARTNERSHIP WITH', W / 2, 74);
    if (img && img.naturalWidth) {
      // contain the logo inside the panel below the caption
      const boxW = W - 120;
      const boxH = H - 190;
      const k = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      c.drawImage(img, (W - w) / 2, 110 + (boxH - h) / 2, w, h);
    } else {
      c.fillStyle = '#14213d';
      c.font = '700 84px "Fredoka", system-ui, sans-serif';
      c.fillText(partner.name, W / 2, H / 2 + 50);
    }
  };
  paint();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    paint(img);
    tex.needsUpdate = true;
  };
  img.src = `${import.meta.env.BASE_URL}assets/brand/${partner.file}`;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  materials.set(id, m);
  return m;
}

export function buildPartnerBanner(id: PartnerId): THREE.Group {
  const g = new THREE.Group();
  g.name = `banner:${id}`;
  const panelW = 4.4;
  const panelH = panelW / 2;
  const y = 3.0;
  // posts + frame
  for (const x of [-panelW / 2 + 0.35, panelW / 2 - 0.35]) cyl(0.09, 0.11, y, mat(0x3d4457, { metal: 0.4, rough: 0.5 }), x, y / 2, -0.06, g, 8);
  box(panelW + 0.24, panelH + 0.24, 0.12, mat(0x14213d, { rough: 0.6 }), 0, y + panelH / 2 - 0.4, -0.08, g);
  box(panelW + 0.3, 0.12, 0.2, mat(0xffc93c), 0, y + panelH - 0.28, -0.04, g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), partnerMaterial(id));
  face.position.set(0, y + panelH / 2 - 0.4, 0);
  g.add(face);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== face) o.castShadow = true;
  });
  return g;
}
