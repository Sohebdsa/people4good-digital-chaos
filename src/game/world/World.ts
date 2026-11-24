import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ENV_BY_ID } from '../../data/environments';
import type { EnvDef, EnvId } from '../../data/types';
import { buildScenery, buildSkyline, animateScenery, SCENERY } from '../models/scenery';
import { instantiate } from '../models/bake';
import { buildPartnerBanner, PARTNERS } from '../models/partnerBanner';

const TRACK_W = 7.4;
const TRACK_LEN = 300;
const TRACK_Z_NEAR = 45;
const TILE = 8; // world units per texture repeat

interface Prop {
  obj: THREE.Group;
  key: string;
  s: number; // absolute track position
  x: number;
  animated: boolean;
}

function trackTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 256);
  // subtle tiles
  c.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < 256; y += 64) c.fillRect(0, y, 256, 3);
  for (let i = 0; i < 3; i++) c.fillRect(i * 85 + 40, 0, 2, 256);
  // lane dividers (dashed)
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (const x of [256 / 3, (256 * 2) / 3]) {
    for (let y = 8; y < 256; y += 64) c.fillRect(x - 3, y, 6, 36);
  }
  // edges
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, 0, 6, 256);
  c.fillRect(250, 0, 6, 256);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, TRACK_LEN / TILE);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
    c.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 6, 2 + Math.random() * 6);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(20, 40);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  private trackMat: THREE.MeshStandardMaterial;
  private groundMat: THREE.MeshStandardMaterial;
  private lineMat: THREE.MeshStandardMaterial;
  private curbMat: THREE.MeshStandardMaterial;
  private trackTex: THREE.Texture;
  private groundTex: THREE.Texture;
  private fog: THREE.Fog;
  private bg: THREE.Color;
  private props: Prop[] = [];
  private pool = new Map<string, THREE.Group[]>();
  private nextSide = [0, 0];
  private nextSky = [0, 0];
  private nextBanner = 0;
  private bannerCount = 0;
  private seed = 1;
  env: EnvDef = ENV_BY_ID.maze;
  private from: EnvDef = ENV_BY_ID.maze;
  private blend = 1;
  private sky: THREE.Mesh | null = null;
  private skyTop = new THREE.Color();
  private skyHorizon = new THREE.Color();
  private tmpA = new THREE.Color();
  private tmpB = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.bg = new THREE.Color(this.env.sky);
    scene.background = this.bg;
    this.fog = new THREE.Fog(this.env.fog, this.env.fogNear, this.env.fogFar);
    scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight(this.env.hemiSky, this.env.hemiGround, this.env.hemiIntensity);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(this.env.sun, this.env.sunIntensity);
    this.sun.position.set(-6, 14, 6);
    this.sun.target.position.set(0, 0, -6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -9;
    sc.right = 9;
    sc.top = 16;
    sc.bottom = -14;
    sc.near = 1;
    sc.far = 50;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.trackTex = trackTexture();
    this.trackMat = new THREE.MeshStandardMaterial({ map: this.trackTex, color: this.env.track, roughness: 0.85 });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W, TRACK_LEN), this.trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, TRACK_Z_NEAR - TRACK_LEN / 2);
    track.receiveShadow = true;
    scene.add(track);

    this.lineMat = new THREE.MeshStandardMaterial({ color: this.env.trackLine, roughness: 0.6, emissive: this.env.trackLine, emissiveIntensity: 0.25 });
    for (const x of [-TRACK_W / 2 - 0.15, TRACK_W / 2 + 0.15]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, TRACK_LEN), this.lineMat);
      edge.position.set(x, 0.06, TRACK_Z_NEAR - TRACK_LEN / 2);
      edge.receiveShadow = true;
      scene.add(edge);
    }
    this.curbMat = new THREE.MeshStandardMaterial({ color: this.env.ground, roughness: 0.9 });
    for (const x of [-TRACK_W / 2 - 1.3, TRACK_W / 2 + 1.3]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2, 0.25, TRACK_LEN), this.curbMat);
      curb.position.set(x, 0.0, TRACK_Z_NEAR - TRACK_LEN / 2);
      curb.receiveShadow = true;
      scene.add(curb);
    }

    this.groundTex = groundTexture();
    this.groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex, color: this.env.ground, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, TRACK_LEN), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, TRACK_Z_NEAR - TRACK_LEN / 2);
    ground.receiveShadow = true;
    scene.add(ground);
  }

  setShadows(on: boolean) {
    this.sun.castShadow = on;
    // higher-res map only when shadows are on; frustum is already fitted to the play area
    const size = on ? 2048 : 512;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }
  }

  /**
   * Image-based lighting (threejs-materials-lighting skill): a PMREM-filtered RoomEnvironment gives
   * PBR materials soft reflections, so metal locks, vaults and screens stop looking flat.
   * Plus a vertex-coloured sky dome (zenith -> horizon) that matches the fog, replacing a flat colour.
   */
  initEnvironment(renderer: THREE.WebGLRenderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = envTex;
    (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.35;

    const geo = new THREE.SphereGeometry(200, 24, 12);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.paintSky();
  }

  private paintSky() {
    if (!this.sky) return;
    // zenith: deeper version of the sky colour; horizon: fog colour so the world melts into it
    this.skyHorizon.copy(this.fog.color);
    this.skyTop.copy(this.bg).multiplyScalar(0.78).lerp(this.tmpB.setHex(0x1b2a6b), 0.12);
    const pos = this.sky.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.sky.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 200);
      const t = Math.pow(h, 0.55);
      this.tmpA.copy(this.skyHorizon).lerp(this.skyTop, t);
      col.setXYZ(i, this.tmpA.r, this.tmpA.g, this.tmpA.b);
    }
    col.needsUpdate = true;
  }

  /** Build one scenery variant (and a skyline) into the pool ahead of time. */
  prewarm(env: EnvId, variant: number, build: (e: EnvId, v: number, seed: number) => THREE.Group) {
    // one of each seed variation the streamer can request
    for (let seedMod = 0; seedMod < 3; seedMod++) {
      const key = `${env}:${variant}:${seedMod}`;
      const obj = instantiate(key, () => build(env, variant, seedMod + variant * 7 + 1));
      obj.visible = false;
      this.scene.add(obj);
      let arr = this.pool.get(key);
      if (!arr) this.pool.set(key, (arr = []));
      arr.push(obj);
    }
    if (variant === 0) {
      for (let k = 0; k < 3; k++) {
        const skyKey = `${env}:sky:${k}`;
        const s = instantiate(skyKey, () => buildSkyline(env, k + 11));
        s.visible = false;
        this.scene.add(s);
        let a2 = this.pool.get(skyKey);
        if (!a2) this.pool.set(skyKey, (a2 = []));
        a2.push(s);
      }
    }
  }

  /** Begin a cross-fade to a new environment. */
  setEnv(id: EnvId, instant = false) {
    const next = ENV_BY_ID[id];
    if (next === this.env && !instant) return;
    this.from = instant ? next : this.currentSnapshot();
    this.env = next;
    this.blend = instant ? 1 : 0;
    if (instant) this.applyBlend(1);
  }

  private currentSnapshot(): EnvDef {
    // capture current blended colours as a pseudo-env to fade from
    const s: EnvDef = {
      ...this.env,
      sky: this.bg.getHex(),
      fog: this.fog.color.getHex(),
      fogNear: this.fog.near,
      fogFar: this.fog.far,
      ground: this.groundMat.color.getHex(),
      track: this.trackMat.color.getHex(),
      trackLine: this.lineMat.color.getHex(),
      sun: this.sun.color.getHex(),
      sunIntensity: this.sun.intensity,
      hemiSky: this.hemi.color.getHex(),
      hemiGround: this.hemi.groundColor.getHex(),
      hemiIntensity: this.hemi.intensity,
    };
    return s;
  }

  private lerpHex(a: number, b: number, t: number, out: THREE.Color) {
    this.tmpA.setHex(a);
    this.tmpB.setHex(b);
    out.copy(this.tmpA).lerp(this.tmpB, t);
  }

  private applyBlend(t: number) {
    const a = this.from;
    const b = this.env;
    this.lerpHex(a.sky, b.sky, t, this.bg);
    this.lerpHex(a.fog, b.fog, t, this.fog.color);
    this.fog.near = a.fogNear + (b.fogNear - a.fogNear) * t;
    this.fog.far = a.fogFar + (b.fogFar - a.fogFar) * t;
    this.lerpHex(a.ground, b.ground, t, this.groundMat.color);
    this.lerpHex(a.ground, b.ground, t, this.curbMat.color);
    this.curbMat.color.multiplyScalar(0.85);
    this.lerpHex(a.track, b.track, t, this.trackMat.color);
    this.lerpHex(a.trackLine, b.trackLine, t, this.lineMat.color);
    this.lineMat.emissive.copy(this.lineMat.color);
    this.lerpHex(a.sun, b.sun, t, this.sun.color);
    this.sun.intensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t;
    this.lerpHex(a.hemiSky, b.hemiSky, t, this.hemi.color);
    this.lerpHex(a.hemiGround, b.hemiGround, t, this.hemi.groundColor);
    this.hemi.intensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * t;
    this.paintSky();
  }

  /** Clear all props (new run). */
  reset(distance: number) {
    for (const p of this.props) this.release(p);
    this.props = [];
    this.nextSide = [distance - 40, distance - 36];
    this.nextSky = [distance - 40, distance - 25];
    this.nextBanner = distance + 24;
  }

  private acquire(key: string, make: () => THREE.Group) {
    const arr = this.pool.get(key);
    const obj = arr && arr.length ? arr.pop()! : make();
    obj.visible = true;
    if (!obj.parent) this.scene.add(obj);
    return obj;
  }

  private release(p: Prop) {
    p.obj.visible = false;
    let arr = this.pool.get(p.key);
    if (!arr) {
      arr = [];
      this.pool.set(p.key, arr);
    }
    arr.push(p.obj);
  }

  update(dt: number, distance: number, t: number, quality: 'high' | 'low') {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 2.5);
      this.applyBlend(this.blend * this.blend * (3 - 2 * this.blend));
    }
    // scroll textures
    this.trackTex.offset.y = (distance / TILE) % 1;
    this.groundTex.offset.y = ((distance / TRACK_LEN) * 40) % 1;

    // spawn props
    const horizon = distance + 150;
    const envId = this.env.id;
    const variants = SCENERY[envId].length;
    for (let side = 0; side < 2; side++) {
      while (this.nextSide[side] < horizon) {
        const s = this.nextSide[side];
        const variant = Math.floor(Math.random() * variants);
        const seed = (this.seed = (this.seed * 16807) % 2147483647);
        const key = `${envId}:${variant}:${seed % 3}`;
        const obj = this.acquire(key, () => instantiate(key, () => buildScenery(envId, variant, seed % 3 + variant * 7 + 1)));
        const x = (side === 0 ? -1 : 1) * (6.2 + Math.random() * 2.2);
        obj.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
        obj.scale.setScalar(0.9 + Math.random() * 0.25);
        this.props.push({ obj, key, s, x, animated: true });
        this.nextSide[side] += 7 + Math.random() * 6;
      }
      while (this.nextSky[side] < horizon + 40) {
        const s = this.nextSky[side];
        const seed = Math.floor(Math.random() * 3);
        const key = `${envId}:sky:${seed}`;
        const obj = this.acquire(key, () => instantiate(key, () => buildSkyline(envId, seed + 11)));
        const x = (side === 0 ? -1 : 1) * (18 + Math.random() * 10) - (side === 0 ? 18 : 0);
        obj.rotation.y = 0;
        obj.scale.setScalar(1);
        this.props.push({ obj, key, s, x, animated: false });
        this.nextSky[side] += 26 + Math.random() * 10;
      }
    }

    // partner billboards: alternate partners and sides roughly every 90 m, angled towards the runner
    while (this.nextBanner < horizon) {
      const partner = PARTNERS[this.bannerCount % PARTNERS.length];
      const side = Math.floor(this.bannerCount / PARTNERS.length) % 2 === 0 ? (this.bannerCount % 2) : 1 - (this.bannerCount % 2);
      const key = `banner:${partner.id}`;
      const obj = this.acquire(key, () => buildPartnerBanner(partner.id));
      obj.rotation.y = side === 0 ? 0.55 : -0.55;
      obj.scale.setScalar(1);
      this.props.push({ obj, key, s: this.nextBanner, x: side === 0 ? -5.3 : 5.3, animated: false });
      this.bannerCount++;
      this.nextBanner += 85 + Math.random() * 15;
    }

    // place & cull
    const animate = quality === 'high';
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      const z = distance - p.s;
      if (z > 40) {
        this.release(p);
        this.props.splice(i, 1);
        continue;
      }
      p.obj.position.set(p.x, 0, z);
      if (animate && p.animated && z > -90) animateScenery(p.obj, t);
    }
  }
}
