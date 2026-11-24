import * as THREE from 'three';
import { box, cyl, glow, mat, sph, mesh, torGeo, sphGeo } from './kit';
import { bakeStatic } from './bake';

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  antennaTip: THREE.Mesh;
  tabletScreen: THREE.Mesh;
}

const C = {
  skin: 0x8d5a3b,
  hair: 0x2a1a12,
  jacket: 0x1f8a8a,
  jacketDark: 0x166b6b,
  trim: 0xffb627,
  shirt: 0xf6efe1,
  trousers: 0x2b3a55,
  pack: 0xd99a2b,
  packDark: 0xa86f17,
  shoe: 0xf4f1ea,
  sole: 0xff7a45,
  watch: 0x222831,
};

/** Kiri — the NGO digital transformation explorer. Faces -Z (away from chase camera). */
export function buildCharacter(): CharacterRig {
  const root = new THREE.Group();
  root.name = 'kiri';
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);
  box(0.42, 0.18, 0.26, mat(C.trousers), 0, 0, 0, hips);
  // belt
  box(0.44, 0.05, 0.28, mat(0x3d2b1f), 0, 0.09, 0, hips);

  const torso = new THREE.Group();
  torso.position.y = 0.1;
  hips.add(torso);
  // jacket body (tapered)
  const jacket = cyl(0.25, 0.22, 0.5, mat(C.jacket), 0, 0.27, 0, torso, 8);
  jacket.scale.set(1, 1, 0.62);
  // shirt v at front
  box(0.14, 0.2, 0.02, mat(C.shirt), 0, 0.42, -0.145, torso);
  // zip + trim
  box(0.025, 0.42, 0.02, mat(C.trim), 0, 0.25, -0.15, torso);
  box(0.48, 0.05, 0.3, mat(C.trim), 0, 0.03, 0, torso);
  // collar
  const collar = mesh(torGeo(0.13, 0.04, 5, 10), mat(C.jacketDark), 0, 0.53, 0, torso);
  collar.rotation.x = Math.PI / 2;
  // shoulders
  sph(0.1, mat(C.jacket), -0.24, 0.46, 0, torso);
  sph(0.1, mat(C.jacket), 0.24, 0.46, 0, torso);
  // badge on chest
  box(0.07, 0.07, 0.02, glow(0x1fb5a8, 0.5), 0.12, 0.38, -0.155, torso);

  // backpack (on +Z, visible from chase cam)
  const pack = new THREE.Group();
  pack.position.set(0, 0.3, 0.2);
  torso.add(pack);
  box(0.4, 0.46, 0.2, mat(C.pack), 0, 0, 0, pack);
  box(0.42, 0.1, 0.22, mat(C.packDark), 0, 0.22, 0, pack);
  box(0.3, 0.18, 0.06, mat(C.packDark), 0, -0.1, 0.12, pack);
  // tablet in outer pocket
  box(0.24, 0.17, 0.02, mat(0x1d2433), 0, 0.06, 0.115, pack);
  const tabletScreen = box(0.2, 0.13, 0.01, glow(0x5ef2ff, 0.9), 0, 0.06, 0.127, pack);
  // straps
  box(0.05, 0.5, 0.05, mat(C.packDark), -0.14, 0.02, -0.11, pack);
  box(0.05, 0.5, 0.05, mat(C.packDark), 0.14, 0.02, -0.11, pack);
  // antenna
  cyl(0.012, 0.012, 0.32, mat(0x444b57), 0.15, 0.38, 0, pack, 5);
  const antennaTip = sph(0.035, glow(0x7bf1a8, 1.2), 0.15, 0.55, 0, pack, 6, 5);
  // rolled mat on top
  const roll = cyl(0.07, 0.07, 0.44, mat(0x2b9348), 0, 0.3, 0.02, pack, 8);
  roll.rotation.z = Math.PI / 2;

  // head
  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  cyl(0.06, 0.07, 0.1, mat(C.skin), 0, -0.02, 0, head, 6);
  const skull = sph(0.19, mat(C.skin), 0, 0.17, 0, head, 12, 10);
  skull.scale.set(1, 1.05, 1);
  // hair cap + bun
  const hair = sph(0.2, mat(C.hair), 0, 0.25, 0.07, head, 12, 8);
  hair.scale.set(1.04, 0.82, 0.95);
  sph(0.1, mat(C.hair), 0, 0.37, 0.1, head, 8, 6);
  sph(0.05, mat(C.hair), -0.12, 0.33, 0.05, head, 6, 5);
  sph(0.05, mat(C.hair), 0.12, 0.33, 0.05, head, 6, 5);
  // headband
  const band = mesh(torGeo(0.19, 0.022, 4, 14), mat(C.trim), 0, 0.26, 0.0, head);
  band.rotation.x = Math.PI / 2 - 0.25;
  // face (on -Z)
  const eyeM = mat(0x1a1410, { rough: 0.3 });
  mesh(sphGeo(0.026, 6, 5), eyeM, -0.07, 0.19, -0.165, head);
  mesh(sphGeo(0.026, 6, 5), eyeM, 0.07, 0.19, -0.165, head);
  mesh(sphGeo(0.009, 4, 3), mat(0xffffff, { emissive: 0xffffff, ei: 0.5 }), -0.062, 0.2, -0.188, head);
  mesh(sphGeo(0.009, 4, 3), mat(0xffffff, { emissive: 0xffffff, ei: 0.5 }), 0.078, 0.2, -0.188, head);
  box(0.06, 0.015, 0.02, mat(C.hair), -0.07, 0.245, -0.165, head).rotation.z = 0.12;
  box(0.06, 0.015, 0.02, mat(C.hair), 0.07, 0.245, -0.165, head).rotation.z = -0.12;
  const smile = mesh(torGeo(0.05, 0.012, 4, 10, Math.PI), mat(0x5a2a1d), 0, 0.12, -0.172, head);
  smile.rotation.z = Math.PI;
  mesh(sphGeo(0.025, 5, 4), mat(0xb56a4f), -0.11, 0.14, -0.15, head);
  mesh(sphGeo(0.025, 5, 4), mat(0xb56a4f), 0.11, 0.14, -0.15, head);
  mesh(sphGeo(0.022, 5, 4), mat(C.skin), 0, 0.16, -0.19, head);
  // ears + earring
  sph(0.04, mat(C.skin), -0.19, 0.17, 0, head, 6, 5);
  sph(0.04, mat(C.skin), 0.19, 0.17, 0, head, 6, 5);
  sph(0.015, glow(0xffb627, 0.5), 0.2, 0.12, 0, head, 5, 4);

  // arms
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.29 * side, 0.46, 0);
    torso.add(shoulder);
    cyl(0.065, 0.06, 0.3, mat(C.jacket), 0, -0.15, 0, shoulder, 7);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    cyl(0.055, 0.05, 0.26, mat(C.jacket), 0, -0.12, 0, elbow, 7);
    box(0.11, 0.04, 0.11, mat(C.trim), 0, -0.24, 0, elbow);
    sph(0.06, mat(C.skin), 0, -0.3, 0, elbow, 7, 6);
    if (side < 0) box(0.07, 0.04, 0.09, mat(C.watch), 0, -0.21, 0, elbow);
    if (side < 0) box(0.04, 0.005, 0.05, glow(0x7bf1a8, 0.8), 0.036, -0.21, 0, elbow).rotation.z = Math.PI / 2;
    return { shoulder, elbow };
  };
  const L = makeArm(-1);
  const R = makeArm(1);

  // legs
  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(0.11 * side, -0.05, 0);
    hips.add(hip);
    cyl(0.09, 0.075, 0.44, mat(C.trousers), 0, -0.22, 0, hip, 7);
    // cargo pocket
    box(0.04, 0.12, 0.1, mat(0x23304a), 0.085 * side, -0.24, 0, hip);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    cyl(0.07, 0.06, 0.4, mat(C.trousers), 0, -0.2, 0, knee, 7);
    // shoe
    box(0.13, 0.1, 0.26, mat(C.shoe), 0, -0.43, -0.04, knee);
    box(0.14, 0.035, 0.28, mat(C.sole), 0, -0.48, -0.04, knee);
    box(0.135, 0.02, 0.08, mat(C.sole), 0, -0.4, 0.04, knee);
    return { hip, knee };
  };
  const LL = makeLeg(-1);
  const RL = makeLeg(1);

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  body.name = 'body'; hips.name = 'hips'; torso.name = 'torso'; head.name = 'head';
  L.shoulder.name = 'armL'; R.shoulder.name = 'armR'; L.elbow.name = 'elbowL'; R.elbow.name = 'elbowR';
  LL.hip.name = 'legL'; RL.hip.name = 'legR'; LL.knee.name = 'kneeL'; RL.knee.name = 'kneeR';
  antennaTip.name = 'antenna'; tabletScreen.name = 'tablet';
  bakeStatic(root);

  return {
    root, body, hips, torso, head,
    armL: L.shoulder, armR: R.shoulder, elbowL: L.elbow, elbowR: R.elbow,
    legL: LL.hip, legR: RL.hip, kneeL: LL.knee, kneeR: RL.knee,
    antennaTip, tabletScreen,
  };
}

/** Simple blob shadow under the character (cheap, always visible). */
export function blobShadow() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

