import * as THREE from 'three';
import { buildCharacter, blobShadow, type CharacterRig } from '../models/character';

export const LANES = [-2.2, 0, 2.2];
export const JUMP_V = 11.2;
export const GRAVITY = -31;
export const SLIDE_TIME = 0.72;
export const STAND_H = 1.7;
export const SLIDE_H = 0.78;

type Mode = 'idle' | 'run' | 'dead' | 'celebrate';

type Pose = {
  bodyY: number; bodyRX: number; bodyRZ: number; bodyZ: number;
  torsoRX: number; torsoRZ: number; headRX: number; headRY: number;
  armLX: number; armLZ: number; armRX: number; armRZ: number; elbowL: number; elbowR: number;
  legL: number; legR: number; kneeL: number; kneeR: number;
};

const ZERO: Pose = {
  bodyY: 0, bodyRX: 0, bodyRZ: 0, bodyZ: 0, torsoRX: 0, torsoRZ: 0, headRX: 0, headRY: 0,
  armLX: 0, armLZ: 0, armRX: 0, armRZ: 0, elbowL: 0, elbowR: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0,
};

export interface PlayerEvents {
  onStep?: () => void;
  /** impact 0..1 from fall speed */
  onLand?: (impact: number) => void;
}

const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
/** easeOutBack: overshoots past 1 then settles (game-feel skill: "overshoot for pops"). */
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class Player {
  rig: CharacterRig;
  shadow: THREE.Mesh;
  lane = 1;
  x = 0;
  y = 0;
  vy = 0;
  grounded = true;
  slideT = 0;
  mode: Mode = 'idle';
  private phase = 0;
  private lastStepSign = 1;
  private jumpBuffer = 0;
  private slideQueued = false;
  private collectT = 0;
  private spinT = 0;
  private hitT = 0;
  private deadT = 0;
  private celebrateT = 0;
  private pose: Pose = { ...ZERO };
  private t = 0;
  invuln = 0;
  events: PlayerEvents = {};
  // squash & stretch (visual only, never touches the hitbox)
  private squashT = 1;
  private squashFrom = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene) {
    this.rig = buildCharacter();
    scene.add(this.rig.root);
    this.shadow = blobShadow();
    scene.add(this.shadow);
  }

  reset() {
    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.slideT = 0;
    this.jumpBuffer = 0;
    this.slideQueued = false;
    this.hitT = 0;
    this.deadT = 0;
    this.spinT = 0;
    this.invuln = 0;
    this.rig.root.visible = true;
    this.rig.root.rotation.set(0, 0, 0);
    this.rig.root.scale.set(1, 1, 1);
    this.squashT = 1;
    this.mode = 'run';
  }

  get sliding() {
    return this.slideT > 0;
  }

  left() {
    if (this.lane > 0) {
      this.lane -= 1;
      return true;
    }
    return false;
  }

  right() {
    if (this.lane < 2) {
      this.lane += 1;
      return true;
    }
    return false;
  }

  jump(): boolean {
    if (this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.slideT = 0;
      this.slideQueued = false;
      this.squash(0.86, 1.16);
      return true;
    }
    this.jumpBuffer = 0.14;
    return false;
  }

  slide(): boolean {
    if (!this.grounded) {
      // fast-fall into a slide
      this.vy = Math.min(this.vy, -18);
      this.slideQueued = true;
      return true;
    }
    if (this.slideT <= 0) {
      this.slideT = SLIDE_TIME;
      this.squash(1.12, 0.9);
      return true;
    }
    this.slideT = SLIDE_TIME;
    return false;
  }

  collect() {
    this.collectT = 0.3;
  }

  /** Start a squash/stretch pop that springs back to 1 with overshoot. */
  private squash(xz: number, y: number) {
    this.squashFrom.set(xz, y, xz);
    this.squashT = 0;
  }
  spin() {
    this.spinT = 0.55;
  }
  hit() {
    this.hitT = 0.45;
  }
  die() {
    this.mode = 'dead';
    this.deadT = 0;
  }
  celebrate(on = true) {
    this.mode = on ? 'celebrate' : 'run';
    this.celebrateT = 0;
  }
  idle() {
    this.mode = 'idle';
  }

  /** Bounds for collision. */
  box() {
    const h = this.sliding ? SLIDE_H : STAND_H;
    return { x: this.x, hw: 0.34, y0: this.y + 0.05, y1: this.y + h, hd: 0.3 };
  }

  update(dt: number, speed: number) {
    this.t += dt;
    // lateral
    const tx = LANES[this.lane];
    this.x += (tx - this.x) * damp(16, dt);
    const lateral = tx - this.x;

    // vertical
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        const impact = Math.min(1, Math.abs(this.vy) / 18);
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.squash(1 + 0.2 * impact, 1 - 0.18 * impact);
        this.events.onLand?.(impact);
        if (this.slideQueued) {
          this.slideQueued = false;
          this.slideT = SLIDE_TIME;
        } else if (this.jumpBuffer > 0) {
          this.jumpBuffer = 0;
          this.jump();
        }
      }
    }
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.slideT > 0) this.slideT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.collectT > 0) this.collectT -= dt;
    if (this.spinT > 0) this.spinT -= dt;
    if (this.hitT > 0) this.hitT -= dt;

    // animation
    const target = this.computePose(dt, speed, lateral);
    const k = damp(this.mode === 'dead' ? 6 : 18, dt);
    for (const key in target) {
      const kk = key as keyof Pose;
      this.pose[kk] += (target[kk] - this.pose[kk]) * k;
    }
    this.applyPose();

    const r = this.rig.root;
    r.position.set(this.x, this.y, 0);
    r.rotation.y = this.spinT > 0 ? (1 - this.spinT / 0.55) * Math.PI * 2 : 0;
    if (this.squashT < 1) {
      this.squashT = Math.min(1, this.squashT + dt / 0.22);
      const e = easeOutBack(this.squashT);
      r.scale.set(
        this.squashFrom.x + (1 - this.squashFrom.x) * e,
        this.squashFrom.y + (1 - this.squashFrom.y) * e,
        this.squashFrom.z + (1 - this.squashFrom.z) * e,
      );
      if (this.squashT >= 1) r.scale.set(1, 1, 1); // always snap back to rest
    }
    // invulnerability blink
    r.visible = this.invuln > 0 && this.mode !== 'dead' ? Math.floor(this.t * 14) % 2 === 0 : true;
    // shadow
    this.shadow.position.set(this.x, 0.02, 0.05);
    const s = Math.max(0.35, 1 - this.y * 0.25);
    this.shadow.scale.set(s, s, s);
    // glow pulse on backpack tech
    (this.rig.antennaTip.scale as THREE.Vector3).setScalar(1 + Math.sin(this.t * 6) * 0.25);
  }

  private computePose(dt: number, speed: number, lateral: number): Pose {
    const p: Pose = { ...ZERO };
    if (this.mode === 'idle') {
      const b = Math.sin(this.t * 2);
      p.bodyY = b * 0.01;
      p.torsoRX = -0.04 + b * 0.02;
      p.headRY = Math.sin(this.t * 0.7) * 0.25;
      p.headRX = 0.05;
      p.armLZ = -0.12; p.armRZ = 0.12;
      p.elbowL = 0.2; p.elbowR = 0.2;
      p.armRX = 0.1 + Math.max(0, Math.sin(this.t * 0.9 + 1)) * 0.3; // checks the tablet now and then
      p.elbowR = 0.2 + Math.max(0, Math.sin(this.t * 0.9 + 1)) * 1.2;
      p.legL = 0.05; p.legR = -0.05;
      return p;
    }
    if (this.mode === 'celebrate') {
      this.celebrateT += dt;
      const w = Math.sin(this.celebrateT * 9);
      p.bodyY = Math.abs(Math.sin(this.celebrateT * 6)) * 0.18;
      p.armLX = 2.9; p.armRX = 2.9;
      p.armLZ = -0.4 + w * 0.15; p.armRZ = 0.4 - w * 0.15;
      p.elbowL = 0.3; p.elbowR = 0.3;
      p.headRX = -0.2;
      p.legL = 0.2; p.kneeL = -0.4;
      return p;
    }
    if (this.mode === 'dead') {
      this.deadT += dt;
      p.bodyRX = 1.45;
      p.bodyZ = 0.4;
      p.bodyY = 0.12;
      p.armLX = -0.4; p.armRX = -0.4; p.armLZ = -1.2; p.armRZ = 1.2;
      p.legL = 0.3; p.legR = 0.1; p.kneeL = -0.6;
      p.headRX = -0.3;
      return p;
    }
    // ---- running family ----
    this.phase += dt * (5 + speed * 0.38);
    const ph = this.phase;
    const sn = Math.sin(ph);
    const sign = sn >= 0 ? 1 : -1;
    if (sign !== this.lastStepSign && this.grounded && !this.sliding) this.events.onStep?.();
    this.lastStepSign = sign;

    p.bodyRZ = lateral * 0.12;
    p.torsoRZ = -lateral * 0.06;
    p.headRY = -lateral * 0.05;

    if (!this.grounded) {
      // jump: tuck
      const rising = this.vy > 0;
      p.legL = 1.0; p.kneeL = -1.4;
      p.legR = rising ? 0.2 : 0.5; p.kneeR = rising ? -0.5 : -1.0;
      p.armLX = 2.2; p.armRX = -0.6; p.armLZ = -0.3; p.armRZ = 0.4;
      p.elbowL = 0.4; p.elbowR = 0.8;
      p.torsoRX = rising ? -0.25 : -0.1;
      p.headRX = rising ? -0.15 : 0.1;
    } else if (this.sliding) {
      p.bodyRX = 1.12;
      p.bodyY = 0.12;
      p.bodyZ = -0.35;
      p.legL = 0.15; p.kneeL = -0.2;
      p.legR = 0.55; p.kneeR = -1.2;
      p.armLX = -0.7; p.armRX = 1.4; p.armLZ = -0.6; p.armRZ = 0.3;
      p.elbowR = 0.6;
      p.headRX = -0.9; // look forward while sliding
      p.torsoRX = -0.2;
    } else {
      p.bodyY = Math.abs(Math.cos(ph)) * 0.09;
      p.torsoRX = -0.2;
      p.headRX = 0.12;
      p.legL = sn * 0.95;
      p.legR = -sn * 0.95;
      p.kneeL = -Math.max(0, -Math.cos(ph)) * 1.5 - 0.15;
      p.kneeR = -Math.max(0, Math.cos(ph)) * 1.5 - 0.15;
      p.armLX = -sn * 0.85;
      p.armRX = sn * 0.85;
      p.elbowL = 1.25; p.elbowR = 1.25;
      p.armLZ = -0.1; p.armRZ = 0.1;
      p.torsoRZ += Math.sin(ph) * 0.05;
    }
    if (this.collectT > 0) {
      const a = Math.sin((this.collectT / 0.3) * Math.PI);
      p.armRX = 2.7 * a + p.armRX * (1 - a);
      p.elbowR = 0.3;
    }
    if (this.hitT > 0) {
      const a = this.hitT / 0.45;
      p.torsoRX += 0.55 * a;
      p.headRX += 0.4 * a;
      p.armLZ -= 0.8 * a; p.armRZ += 0.8 * a;
    }
    return p;
  }

  private applyPose() {
    const r = this.rig;
    const p = this.pose;
    r.body.position.y = p.bodyY;
    r.body.position.z = p.bodyZ;
    r.body.rotation.x = p.bodyRX;
    r.body.rotation.z = p.bodyRZ;
    r.torso.rotation.x = p.torsoRX;
    r.torso.rotation.z = p.torsoRZ;
    r.head.rotation.x = p.headRX;
    r.head.rotation.y = p.headRY;
    r.armL.rotation.x = p.armLX;
    r.armL.rotation.z = p.armLZ;
    r.armR.rotation.x = p.armRX;
    r.armR.rotation.z = p.armRZ;
    r.elbowL.rotation.x = p.elbowL;
    r.elbowR.rotation.x = p.elbowR;
    r.legL.rotation.x = p.legL;
    r.legR.rotation.x = p.legR;
    r.kneeL.rotation.x = p.kneeL;
    r.kneeR.rotation.x = p.kneeR;
  }
}
