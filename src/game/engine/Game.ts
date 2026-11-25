import * as THREE from 'three';
import { World } from '../world/World';
import { Player, LANES } from '../player/Player';
import { Particles } from '../effects/Particles';
import { Spawner, type Plan } from '../spawning/Spawner';
import { Input, type Action } from './Input';
import { buildRisk, animateRisk, SHAPE_BOX } from '../models/riskModels';
import { buildTool, buildPower, buildGate } from '../models/toolModels';
import { setShadows, allTextures } from '../models/kit';
import { instantiate } from '../models/bake';
import { buildScenery, SCENERY } from '../models/scenery';
import { RISKS } from '../../data/risks';
import { TOOLS, POWERS } from '../../data/tools';
import { RISK_BY_ID } from '../../data/risks';
import { TOOL_BY_ID, POWER_BY_ID } from '../../data/tools';
import { SCENARIOS } from '../../data/scenarios';
import { ENVIRONMENTS, ENV_BY_ID, ENV_ORDER, envForDistance } from '../../data/environments';
import type { EnvId, PowerId, ScenarioDef } from '../../data/types';
import { audio, type Sfx } from '../../systems/audio/AudioManager';
import { progression } from '../../systems/progression';
import { useRun, type RunSummary } from '../../store/runStore';
import { useApp, type RunRequest } from '../../store/appStore';

type State = 'menu' | 'countdown' | 'running' | 'paused' | 'gate' | 'dying' | 'over';

interface Entity {
  kind: 'risk' | 'tool' | 'power' | 'gate';
  id: string;
  key: string;
  lane: number;
  s: number;
  x: number;
  y: number;
  obj: THREE.Group;
  done: boolean;
  attracted: boolean;
  spinOffset: number;
  /** true once obj went back to the pool; obj may already belong to another entity */
  released?: boolean;
}

const MAX_HEALTH = 3;

/** Frame-rate-independent smoothing factor (camera-systems skill): same feel at any FPS. */
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const COMBO_WINDOW = 1.8;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private player: Player;
  private particles: Particles;
  private spawner = new Spawner();
  private input: Input;
  private container: HTMLElement;
  private raf = 0;
  private last = 0;
  private time = 0;
  state: State = 'menu';
  private pausedFrom: State = 'running';

  // run state
  private entities: Entity[] = [];
  private pool = new Map<string, THREE.Group[]>();
  private plans: Plan[] = [];
  private gateObj: THREE.Group | null = null;
  private distance = 0;
  private startS = 0;
  private speed = 0;
  private slowT = 0;
  private gateSlow = 1;
  private countdown = 0;
  private dyingT = 0;
  private score = 0;
  private distScore = 0;
  private health = MAX_HEALTH;
  private tools = 0;
  private combo = 0;
  private comboT = 0;
  private powers = new Map<PowerId, number>();
  private env: EnvId = 'maze';
  private envIndexStart = 0;
  private request: RunRequest = { env: 'maze' };
  private gateQueue: string[] = [];
  private gatesSeen = new Set<string>();
  private currentGate: ScenarioDef | null = null;
  private hudT = 0;
  private hintT = 0;
  // game feel (game-feel skill): trauma-based shake + hit-stop that decays in real time
  private trauma = 0;
  private shakeT = 0;
  private hitStopReal = 0;
  private hitFlash = 0;
  // adaptive resolution (threejs-scene-setup skill): pixel ratio is a fill-rate budget
  private prMax = 1;
  private prCur = 1;
  private prAcc = 0;
  private prFrames = 0;
  private prCooldown = 0;
  private prGoodTime = 0;
  private prewarmQueue: (() => void)[] = [];
  private stats = this.emptyStats();
  private toolToastShown = new Set<string>();
  private shieldBubble: THREE.Mesh;
  private menuEnvT = 0;
  private menuEnvIdx = 0;
  private camPos = new THREE.Vector3(3, 2.2, -5);
  private camLook = new THREE.Vector3(0, 1.1, 0);
  private tmpPos = new THREE.Vector3();
  private tmpLook = new THREE.Vector3();
  private quality: 'high' | 'low' = 'high';
  private reduceMotion = false;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'game-canvas';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 260);
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.player.events.onStep = () => audio.play('step');
    this.player.events.onLand = (impact) => {
      if (this.state !== 'running') return;
      audio.play('land');
      // small-tier feedback: dust only, no shake (landing happens constantly)
      this.particles.burst(this.player.x, 0.08, 0.1, this.world.env.ground, Math.round(4 + impact * 4), { speed: 1.6, up: 1.2, gravity: -6, life: 0.4, size: 0.8 });
    };
    this.particles = new Particles(this.scene);

    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x1fb5a8, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.shieldBubble.position.y = 0.95;
    this.shieldBubble.visible = false;
    this.player.rig.root.add(this.shieldBubble);

    this.input = new Input((a) => this.onAction(a));
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('pagehide', this.pageHide);
    this.resize();
    this.applySettings();
    this.world.initEnvironment(this.renderer);
    this.showMenu();
    this.queuePrewarm();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private emptyStats() {
    return {
      toolCounts: {} as Record<string, number>,
      riskHits: {} as Record<string, number>,
      riskAvoids: {} as Record<string, number>,
      gateResults: [] as { scenarioId: string; correct: boolean }[],
      envs: new Set<EnvId>(),
      avoided: 0,
      hits: 0,
    };
  }

  // ------------------------------------------------------------------ settings
  applySettings() {
    const s = useApp.getState().settings;
    this.quality = s.quality;
    this.reduceMotion = s.reduceMotion;
    const dpr = window.devicePixelRatio || 1;
    // start at a 1.5 budget and let the adaptive controller raise or lower it
    this.prMax = Math.min(dpr, s.quality === 'high' ? 2 : 1);
    this.prCur = Math.min(this.prMax, s.quality === 'high' ? 1.5 : 1);
    this.prAcc = 0;
    this.prFrames = 0;
    this.prGoodTime = 0;
    this.prCooldown = 3;
    this.renderer.setPixelRatio(this.prCur);
    this.renderer.shadowMap.enabled = s.quality === 'high';
    this.world.setShadows(s.quality === 'high');
    this.resize();
    audio.setVolumes(s.music, s.sfx, s.muted);
  }

  private resize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep all three lanes visible on narrow portrait screens
    this.camera.fov = w / h < 0.8 ? 74 : 60;
    this.camera.updateProjectionMatrix();
  };

  private visibility = () => {
    if (document.hidden) {
      if (this.state === 'running' || this.state === 'countdown') this.pause();
      audio.suspend();
    } else {
      audio.resume();
      this.last = performance.now();
    }
  };

  // ------------------------------------------------------------------ public API
  showMenu() {
    this.clearEntities();
    this.state = 'menu';
    this.input.enabled = false;
    this.player.reset();
    this.player.mode = 'run';
    const unlocked = useApp.getState().profile.unlockedEnvs;
    this.menuEnvIdx = Math.max(0, ENV_ORDER.indexOf(unlocked[unlocked.length - 1] ?? 'maze'));
    this.menuEnvT = 0;
    this.env = ENV_ORDER[this.menuEnvIdx];
    this.world.setEnv(this.env, true);
    this.distance = ENV_BY_ID[this.env].startDistance;
    this.world.reset(this.distance);
    this.speed = 7;
    this.powers.clear();
    useRun.getState().set({ phase: 'idle', gate: null, toasts: [] });
    if (audio.ready) audio.startMusic('menu', this.env);
    audio.setMusicMode('menu');
    audio.setMusicEnv(this.env);
    audio.setMuffled(false);
  }

  startRun(req: RunRequest) {
    audio.unlock();
    this.request = req;
    this.clearEntities();
    this.env = req.env;
    this.envIndexStart = ENV_ORDER.indexOf(req.env);
    this.startS = ENV_BY_ID[req.env].startDistance;
    this.distance = this.startS;
    this.world.setEnv(req.env, this.state !== 'menu');
    this.world.reset(this.distance);
    this.spawner.reset(this.startS);
    this.player.reset();
    this.score = 0;
    this.distScore = 0;
    this.health = MAX_HEALTH;
    this.tools = 0;
    this.combo = 0;
    this.comboT = 0;
    this.slowT = 0;
    this.gateSlow = 1;
    this.powers.clear();
    this.stats = this.emptyStats();
    this.toolToastShown.clear();
    this.gatesSeen.clear();
    this.gateQueue = this.buildGateQueue(req.gates);
    this.speed = 0;
    this.countdown = 3;
    this.state = 'countdown';
    this.input.enabled = true;
    this.hintT = useApp.getState().settings.showHints ? 6.5 : 0;
    progression.begin();
    if (req.env === 'maze') progression.reachEnv(req.env);
    else progression.unlockEnv(req.env);
    this.stats.envs.add(req.env);
    progression.updateHud();
    useRun.getState().set({
      phase: 'countdown', countdown: 3, score: 0, distance: 0, health: MAX_HEALTH, maxHealth: MAX_HEALTH, tools: 0,
      combo: 0, multiplier: 1, env: req.env, envProgress: 0, powers: [], toasts: [], gate: null, summary: null,
      hint: this.hintT > 0 ? 'controls' : null, hitFlash: 0,
    });
    audio.startMusic('run', req.env);
    audio.setMusicMode('run');
    audio.setMusicEnv(req.env);
    audio.setMuffled(false);
    audio.play('tick');
  }

  private buildGateQueue(prioritised?: string[]) {
    const seenLifetime = progression.life;
    const rest = SCENARIOS.map((s) => s.id)
      .filter((id) => !prioritised?.includes(id))
      .sort((a, b) => (seenLifetime[`gate:seen:${a}`] ?? 0) - (seenLifetime[`gate:seen:${b}`] ?? 0) || Math.random() - 0.5);
    return [...(prioritised ?? []), ...rest];
  }

  pause() {
    if (this.state !== 'running' && this.state !== 'countdown') return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    useRun.getState().set({ phase: 'paused' });
    audio.setMuffled(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.pausedFrom;
    if (this.state === 'running') {
      // brief countdown so the player can re-orient
      this.state = 'countdown';
      this.countdown = 1.5;
    }
    this.last = performance.now();
    useRun.getState().set({ phase: this.state === 'countdown' ? 'countdown' : 'running' });
    audio.setMuffled(false);
  }

  restart() {
    this.startRun(this.request);
  }

  /** Leave a run early: progress is still saved. */
  quitToMenu() {
    if (this.state !== 'menu' && this.state !== 'over') {
      this.commitRun(false);
    }
    this.showMenu();
  }

  answerGate(originalIndex: number) {
    const run = useRun.getState();
    const g = run.gate;
    if (!g || g.chosen !== null || !this.currentGate) return;
    const opt = this.currentGate.options[originalIndex];
    const correct = opt.correct;
    let protectedBy = false;
    progression.add('gate:total');
    progression.add(`gate:seen:${this.currentGate.id}`);
    if (correct) {
      progression.add('gate:correct');
      progression.add(`gate:correct:${this.currentGate.id}`);
      this.addScore(200, false);
      audio.play('correct');
      this.player.celebrate(true);
      this.particles.burst(this.player.x, 1.6, -1, 0xffc93c, 30, { speed: 3, up: 5 });
    } else {
      audio.play('wrong');
      if (this.powers.has('oversight')) {
        this.powers.delete('oversight');
        protectedBy = true;
      } else {
        this.health = Math.max(1, this.health - 1);
        this.player.hit();
      }
    }
    this.stats.gateResults.push({ scenarioId: this.currentGate.id, correct });
    run.set({ gate: { ...g, chosen: originalIndex, protectedByOversight: protectedBy }, health: this.health });
    progression.check();
  }

  continueAfterGate() {
    if (this.state !== 'gate') return;
    this.currentGate = null;
    this.player.celebrate(false);
    this.state = 'countdown';
    this.countdown = 1.2;
    this.player.invuln = 1.5;
    useRun.getState().set({ phase: 'countdown', gate: null });
    audio.setMuffled(false);
    this.last = performance.now();
  }

  /** Called on first user gesture so menu music can start (autoplay policy). */
  ensureAudio() {
    const first = !audio.ready;
    audio.unlock();
    if (first) {
      audio.startMusic(this.state === 'menu' ? 'menu' : 'run', this.env);
      audio.setMusicMode(this.state === 'menu' ? 'menu' : 'run');
    }
  }

  /**
   * Prewarm (performance-optimization skill: "first-use hitches"): build one of every risk,
   * tool, power-up and scenery variant into the pools, upload their textures and compile their
   * shaders while the menu is idle, a few per frame, so nothing is built mid-run.
   */
  private queuePrewarm() {
    const park = (obj: THREE.Group, key: string) => {
      obj.visible = false;
      obj.position.set(0, -60, 0);
      if (!obj.parent) {
        setShadows(obj, this.quality === 'high');
        this.scene.add(obj);
      }
      let arr = this.pool.get(key);
      if (!arr) this.pool.set(key, (arr = []));
      arr.push(obj);
    };
    for (const r of RISKS) this.prewarmQueue.push(() => park(instantiate(`r:${r.id}`, () => buildRisk(r.id, r.shape)), `r:${r.id}`));
    for (const t of TOOLS) this.prewarmQueue.push(() => {
      park(instantiate(`t:${t.id}`, () => buildTool(t.id)), `t:${t.id}`);
      park(instantiate(`t:${t.id}`, () => buildTool(t.id)), `t:${t.id}`);
    });
    for (const p of POWERS) this.prewarmQueue.push(() => park(instantiate(`p:${p.id}`, () => buildPower(p.id, p.color)), `p:${p.id}`));
    for (const env of ENV_ORDER) {
      for (let v = 0; v < SCENERY[env].length; v++) this.prewarmQueue.push(() => this.world.prewarm(env, v, buildScenery));
    }
    this.prewarmQueue.push(() => {
      if (!this.gateObj) {
        this.gateObj = buildGate();
        this.gateObj.visible = false;
        this.scene.add(this.gateObj);
      }
    });
    this.prewarmQueue.push(() => {
      for (const t of allTextures()) this.renderer.initTexture(t);
      // compile every program AND upload every vertex buffer of the pooled (hidden) models:
      // compile() alone builds shaders but geometry is only uploaded on first draw, which caused
      // a ~50 ms spike on the first frame a run spawned risks. Draw them once into a tiny target.
      const hidden: { o: THREE.Object3D; p: THREE.Vector3 }[] = [];
      this.scene.traverse((o) => {
        if (!o.visible) {
          hidden.push({ o, p: o.position.clone() });
          o.visible = true;
        }
      });
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const front = this.camera.position.clone().addScaledVector(fwd, 30);
      for (const h of hidden) if (h.o.parent === this.scene) h.o.position.copy(front);
      this.renderer.compile(this.scene, this.camera);
      const rt = new THREE.WebGLRenderTarget(16, 16);
      const prevTarget = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(rt);
      this.renderer.render(this.scene, this.camera);
      // second pass inside the sun's shadow frustum so the shadow-depth shaders are warmed too
      for (const h of hidden) if (h.o.parent === this.scene) h.o.position.set(0, 0, -6);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(prevTarget);
      rt.dispose();
      for (const h of hidden) {
        h.o.position.copy(h.p);
        h.o.visible = false;
      }
    });
  }

  private runPrewarm(budgetMs: number) {
    const t0 = performance.now();
    while (this.prewarmQueue.length && performance.now() - t0 < budgetMs) this.prewarmQueue.shift()!();
  }

  /** Trauma adds up (clamped); shake = trauma squared so light hits barely move and heavy hits punch. */
  private addTrauma(amount: number) {
    if (this.reduceMotion) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Short freeze on impact. Real-time duration; a newer stop only ever extends it. */
  private hitStop(seconds: number) {
    this.hitStopReal = Math.max(this.hitStopReal, seconds);
  }

  /** Save progress of an in-flight run (page hide / engine teardown). */
  saveInFlight() {
    // progression.commit writes a full snapshot, so repeating it later (at game over) is safe
    if (this.state === 'running' || this.state === 'paused' || this.state === 'gate' || this.state === 'countdown' || this.state === 'dying') {
      const score = Math.floor(this.score);
      progression.commit((p) => ({ ...p, best: Math.max(p.best, score) }));
    }
  }

  private pageHide = () => this.saveInFlight();

  dispose() {
    this.saveInFlight();
    window.removeEventListener('pagehide', this.pageHide);
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.input.dispose();
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.visibility);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------------ input
  private onAction(a: Action) {
    if (a === 'pause') {
      if (this.state === 'running' || this.state === 'countdown') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (this.state !== 'running') return;
    let ok = false;
    let sfx: Sfx = 'lane';
    if (a === 'left') ok = this.player.left();
    else if (a === 'right') ok = this.player.right();
    else if (a === 'jump') {
      ok = this.player.jump();
      sfx = 'jump';
    } else if (a === 'slide') {
      ok = this.player.slide();
      sfx = 'slide';
    }
    if (ok) audio.play(sfx);
  }

  // ------------------------------------------------------------------ entities
  private acquire(key: string, make: () => THREE.Group) {
    const arr = this.pool.get(key);
    const obj = arr && arr.length ? arr.pop()! : make();
    if (!obj.parent) {
      setShadows(obj, this.quality === 'high');
      this.scene.add(obj);
    }
    obj.visible = true;
    return obj;
  }

  /**
   * Return an entity's object to its pool exactly once. Collected items are released at pickup,
   * then the entity record lingers until it scrolls off; releasing again would put the same object
   * in the pool twice (two live items sharing one mesh → an item hidden or moved by the other,
   * i.e. invisible pickups that still trigger). After release the entity must never touch obj.
   */
  private releaseEntity(e: Entity) {
    if (e.released) return;
    e.released = true;
    e.obj.visible = false;
    if (e.kind === 'gate') return;
    let arr = this.pool.get(e.key);
    if (!arr) {
      arr = [];
      this.pool.set(e.key, arr);
    }
    arr.push(e.obj);
  }

  private clearEntities() {
    for (const e of this.entities) this.releaseEntity(e);
    this.entities = [];
  }

  private spawn(p: Plan) {
    if (p.kind === 'gate') {
      if (!this.gateObj) {
        this.gateObj = buildGate();
        this.scene.add(this.gateObj);
      }
      this.gateObj.visible = true;
      this.entities.push({ kind: 'gate', id: 'gate', key: 'gate', lane: 1, s: p.s, x: 0, y: 0, obj: this.gateObj, done: false, attracted: false, spinOffset: 0 });
      return;
    }
    if (p.kind === 'risk') {
      const def = RISK_BY_ID[p.id];
      const obj = this.acquire(`r:${p.id}`, () => instantiate(`r:${p.id}`, () => buildRisk(p.id, def.shape)));
      this.entities.push({ kind: 'risk', id: p.id, key: `r:${p.id}`, lane: p.lane, s: p.s, x: LANES[p.lane], y: 0, obj, done: false, attracted: false, spinOffset: 0 });
      return;
    }
    if (p.kind === 'tool') {
      const obj = this.acquire(`t:${p.id}`, () => instantiate(`t:${p.id}`, () => buildTool(p.id)));
      this.entities.push({ kind: 'tool', id: p.id, key: `t:${p.id}`, lane: p.lane, s: p.s, x: LANES[p.lane], y: p.y, obj, done: false, attracted: false, spinOffset: Math.random() * 6 });
      return;
    }
    const pd = POWER_BY_ID[p.id];
    const obj = this.acquire(`p:${p.id}`, () => instantiate(`p:${p.id}`, () => buildPower(p.id, pd.color)));
    this.entities.push({ kind: 'power', id: p.id, key: `p:${p.id}`, lane: p.lane, s: p.s, x: LANES[p.lane], y: 1.1, obj, done: false, attracted: false, spinOffset: 0 });
  }

  // ------------------------------------------------------------------ scoring
  private multiplier() {
    const comboMult = 1 + Math.min(4, Math.floor(this.combo / 8));
    return comboMult * (this.powers.has('boost') ? 2 : 1);
  }

  private addScore(n: number, useMult = true) {
    this.score += useMult ? n * this.multiplier() : n;
  }

  // ------------------------------------------------------------------ gameplay events
  private collectTool(e: Entity) {
    e.done = true;
    const def = TOOL_BY_ID[e.id];
    this.tools += 1;
    this.combo += 1;
    this.comboT = COMBO_WINDOW;
    if (this.combo > 0 && this.combo % 8 === 0) audio.play('combo');
    this.addScore(def.points);
    this.stats.toolCounts[e.id] = (this.stats.toolCounts[e.id] ?? 0) + 1;
    progression.add('tools');
    progression.add(`tool:${e.id}`);
    progression.add(`group:${def.group}`);
    progression.discoverTool(e.id);
    progression.check();
    audio.play(def.sound);
    this.player.collect();
    this.particles.burst(e.obj.position.x, e.obj.position.y, e.obj.position.z, def.color, 12, { speed: 2.4, up: 2.5, life: 0.5 });
    if (!this.toolToastShown.has(e.id)) {
      this.toolToastShown.add(e.id);
      useRun.getState().pushToast({ kind: 'tool', title: def.name, text: def.message, color: '#' + def.color.toString(16).padStart(6, '0'), icon: `items/${e.id}` });
    }
    this.releaseEntity(e);
  }

  private collectPower(e: Entity) {
    e.done = true;
    const def = POWER_BY_ID[e.id as PowerId];
    this.powers.set(def.id, def.duration);
    this.addScore(50);
    audio.play('powerup');
    this.player.spin();
    this.particles.burst(this.player.x, 1.0, 0, def.color, 26, { speed: 3.5, up: 1, ring: true, gravity: 0, life: 0.6 });
    useRun.getState().pushToast({ kind: 'power', title: def.name, text: def.lesson, color: '#' + def.color.toString(16).padStart(6, '0'), icon: `powerups/${def.id}` });
    progression.add(`power:${def.id}`);
    this.releaseEntity(e);
  }

  private hitRisk(e: Entity) {
    e.done = true;
    const def = RISK_BY_ID[e.id];
    progression.discoverRisk(e.id);
    const ex = e.obj.position.x;
    const ez = e.obj.position.z;
    // protection order: Human Oversight (AI risks) → Data Protection Shield (data/privacy) → Backup Shield (any)
    let blockedBy: PowerId | null = null;
    if (def.category === 'ai' && this.powers.has('oversight')) blockedBy = 'oversight';
    else if (def.category !== 'ai' && this.powers.has('shield')) blockedBy = 'shield';
    else if (this.powers.has('backup')) blockedBy = 'backup';
    if (blockedBy) {
      this.powers.delete(blockedBy);
      const pd = POWER_BY_ID[blockedBy];
      if (blockedBy === 'backup') this.addScore(300, false);
      audio.play('block');
      this.addTrauma(0.3);
      this.hitStop(0.05);
      this.particles.burst(ex, 1.2, ez, pd.color, 24, { speed: 4, up: 3 });
      e.obj.visible = false;
      this.player.invuln = 0.8;
      this.stats.avoided += 1;
      progression.add('avoid');
      progression.add(`avoid:${e.id}`);
      progression.add(`avoidcat:${def.category}`);
      this.stats.riskAvoids[e.id] = (this.stats.riskAvoids[e.id] ?? 0) + 1;
      useRun.getState().pushToast({ kind: 'power', title: `${pd.name} absorbed: ${def.name}`, text: def.message, color: '#' + pd.color.toString(16).padStart(6, '0'), icon: `powerups/${pd.id}` });
      progression.check();
      return;
    }
    this.health -= 1;
    this.combo = 0;
    this.stats.hits += 1;
    this.stats.riskHits[e.id] = (this.stats.riskHits[e.id] ?? 0) + 1;
    progression.add(`hit:${e.id}`);
    progression.add(`hitcat:${def.category}`);
    audio.play('hit');
    this.player.hit();
    this.player.invuln = 1.6;
    this.slowT = 1.2;
    const fatal = this.health <= 0;
    this.addTrauma(fatal ? 0.9 : 0.6);
    this.hitStop(fatal ? 0.14 : 0.08);
    useRun.getState().set({ hitFlash: ++this.hitFlash });
    this.particles.burst(ex, 1.0, ez + 0.5, 0xe63946, 18, { speed: 3.5, up: 4 });
    useRun.getState().pushToast({ kind: 'risk', title: def.name, text: def.message, color: '#e63946', icon: `obstacles/${e.id}` });
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dying';
      this.dyingT = 0;
      this.player.die();
      audio.play('gameover');
      useRun.getState().set({ phase: 'dying', health: 0 });
    }
  }

  private avoidRisk(e: Entity) {
    e.done = true;
    const def = RISK_BY_ID[e.id];
    progression.discoverRisk(e.id);
    this.stats.avoided += 1;
    this.stats.riskAvoids[e.id] = (this.stats.riskAvoids[e.id] ?? 0) + 1;
    progression.add('avoid');
    progression.add(`avoid:${e.id}`);
    progression.add(`avoidcat:${def.category}`);
    this.addScore(5);
    progression.check();
  }

  private openGate(e: Entity) {
    e.done = true;
    let id = this.gateQueue.find((x) => !this.gatesSeen.has(x));
    if (!id) {
      this.gatesSeen.clear();
      id = this.gateQueue[0];
    }
    this.gatesSeen.add(id);
    const scenario = SCENARIOS.find((s) => s.id === id)!;
    this.currentGate = scenario;
    const order = scenario.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.state = 'gate';
    this.player.idle();
    audio.play('gate');
    audio.setMuffled(true);
    useRun.getState().set({ phase: 'gate', gate: { scenario, order, chosen: null, protectedByOversight: false } });
  }

  private changeEnv(id: EnvId) {
    this.env = id;
    this.world.setEnv(id);
    audio.setMusicEnv(id);
    audio.play('env');
    progression.reachEnv(id);
    this.stats.envs.add(id);
    progression.check();
    const def = ENV_BY_ID[id];
    useRun.getState().pushToast({ kind: 'env', title: def.name, text: def.tagline, color: '#ffffff' });
  }

  // ------------------------------------------------------------------ run end
  private commitRun(finished: boolean): RunSummary {
    const app = useApp.getState();
    const best = app.profile.best;
    const score = Math.floor(this.score);
    const distance = Math.floor(this.distance - this.startS);
    const newBest = score > best;
    progression.add('runs');
    progression.check();
    progression.commit((p) => ({
      ...p,
      best: Math.max(p.best, score),
      bestDistance: Math.max(p.bestDistance, distance),
      runs: p.runs + 1,
      tutorialSeen: true,
    }));
    const summary: RunSummary = {
      score, distance, tools: this.tools,
      risksAvoided: this.stats.avoided, risksHit: this.stats.hits,
      gatesSeen: this.stats.gateResults.length, gatesCorrect: this.stats.gateResults.filter((g) => g.correct).length,
      missionsCompleted: [...progression.newMissions], achievementsUnlocked: [...progression.newAchievements],
      toolCounts: { ...this.stats.toolCounts }, riskHits: { ...this.stats.riskHits }, riskAvoids: { ...this.stats.riskAvoids },
      gateResults: [...this.stats.gateResults], envsReached: [...this.stats.envs],
      newBest, best: Math.max(best, score),
    };
    if (finished) useRun.getState().set({ summary, phase: 'over' });
    return summary;
  }

  // ------------------------------------------------------------------ main loop
  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, Math.max(0, raw));
    this.last = now;
    this.time += dt;
    const t0 = performance.now();
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.adaptResolution(raw, performance.now() - t0);
    if (this.state === 'menu' && this.prewarmQueue.length) this.runPrewarm(6);
  };

  /**
   * Lower the pixel ratio in 0.25 steps when frames are sustained-slow; raise it again only after
   * a long stretch of headroom (separate thresholds + cooldown, so it never oscillates).
   */
  private adaptResolution(interval: number, workMs: number) {
    if (this.state !== 'running' || interval > 0.25 || document.hidden) return; // ignore stalls and hidden tabs
    this.prAcc += interval;
    this.prFrames++;
    if (this.prCooldown > 0) this.prCooldown -= interval;
    if (this.prAcc < 2) return;
    const avgMs = (this.prAcc / this.prFrames) * 1000;
    this.prAcc = 0;
    this.prFrames = 0;
    if (this.prCooldown > 0) return;
    if (avgMs > 21 && this.prCur > 0.75) {
      this.prCur = Math.max(0.75, this.prCur - 0.25);
      this.renderer.setPixelRatio(this.prCur);
      this.prCooldown = 4;
      this.prGoodTime = 0;
    } else if (avgMs < 17.5 && workMs < 8 && this.prCur < this.prMax) {
      this.prGoodTime += 2;
      if (this.prGoodTime >= 10) {
        this.prCur = Math.min(this.prMax, this.prCur + 0.25);
        this.renderer.setPixelRatio(this.prCur);
        this.prCooldown = 6;
        this.prGoodTime = 0;
      }
    } else {
      this.prGoodTime = 0;
    }
  }

  /** Debug / benchmark info (used by the dev handle). */
  get perf() {
    return { pixelRatio: this.prCur, maxPixelRatio: this.prMax, prewarmLeft: this.prewarmQueue.length };
  }

  private update(realDt: number) {
    const st = this.state;
    if (st === 'paused') return;
    let dt = realDt;
    if (this.hitStopReal > 0) {
      this.hitStopReal -= realDt;
      dt = realDt * 0.05;
    }

    if (st === 'menu') {
      this.updateMenu(dt);
    } else if (st === 'countdown') {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after > 0) audio.play('tick');
      if (this.countdown <= 0) {
        this.state = 'running';
        audio.play('go');
        useRun.getState().set({ phase: 'running', countdown: 0 });
      } else {
        useRun.getState().set({ countdown: after });
      }
      this.player.update(dt, 0);
      this.updateEntitiesVisual(dt, 0);
    } else if (st === 'running') {
      this.updateRun(dt);
    } else if (st === 'gate') {
      this.player.update(dt, 0);
      this.animateGate(dt);
    } else if (st === 'dying') {
      this.dyingT += dt;
      this.speed *= Math.pow(0.02, dt);
      this.distance += this.speed * dt;
      this.player.update(dt, 0);
      this.updateEntitiesVisual(dt, this.speed * dt);
      if (this.dyingT > 1.5) {
        this.state = 'over';
        this.commitRun(true);
        this.input.enabled = false;
      }
    } else if (st === 'over') {
      this.player.update(dt, 0);
    }

    this.world.update(dt, this.distance, this.time, this.quality);
    this.particles.update(dt, st === 'running' ? this.speed * dt : 0);
    this.updateCamera(realDt);
  }

  private updateMenu(dt: number) {
    this.speed = 7;
    this.distance += this.speed * dt;
    this.player.mode = 'run';
    this.player.update(dt, this.speed);
    // cycle through environments as a living showcase
    this.menuEnvT += dt;
    if (this.menuEnvT > 16) {
      this.menuEnvT = 0;
      this.menuEnvIdx = (this.menuEnvIdx + 1) % ENVIRONMENTS.length;
      this.env = ENV_ORDER[this.menuEnvIdx];
      this.world.setEnv(this.env);
      audio.setMusicEnv(this.env);
    }
  }

  private animateGate(_dt: number) {
    if (!this.gateObj) return;
    const sym = refs(this.gateObj).sym;
    if (sym) sym.rotation.z = this.time * 1.5;
  }

  private updateRun(dt: number) {
    const runDist = this.distance - this.startS;
    const d = Math.min(1, (runDist + this.envIndexStart * 280) / 3400);
    const base = 13 + 16 * Math.pow(d, 0.85) + Math.max(0, runDist - 3400) * 0.0008;
    if (this.slowT > 0) this.slowT -= dt;
    const slow = this.slowT > 0 ? 0.65 + 0.35 * (1 - this.slowT / 1.2) : 1;
    // ease toward gates
    let gateSlow = 1;
    const gate = this.entities.find((e) => e.kind === 'gate' && !e.done);
    if (gate) {
      const z = this.distance - gate.s;
      if (z > -26) gateSlow = Math.max(0.35, -z / 26);
    }
    this.gateSlow += (gateSlow - this.gateSlow) * damp(4, dt);
    const targetSpeed = Math.min(34, base) * slow * this.gateSlow;
    this.speed += (targetSpeed - this.speed) * damp(3, dt);
    const dz = this.speed * dt;
    this.distance += dz;
    this.distScore += dz;
    while (this.distScore >= 1) {
      this.distScore -= 1;
      this.addScore(1);
    }

    // environment progression
    const envNow = envForDistance(this.distance).id;
    if (envNow !== this.env) this.changeEnv(envNow);
    else if (runDist > 300 && !progression.run[`env:${envNow}`]) {
      progression.reachEnv(envNow);
      progression.check();
    }

    // timers
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    for (const [id, t] of this.powers) {
      const nt = t - dt;
      if (nt <= 0) this.powers.delete(id);
      else this.powers.set(id, nt);
    }
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) useRun.getState().set({ hint: null });
    }

    // spawning
    this.plans.length = 0;
    this.spawner.generate(this.distance, d, Math.max(this.speed, 13), this.plans);
    for (const p of this.plans) this.spawn(p);

    this.player.update(dt, this.speed);
    this.updateEntities(dt);
    this.updateShieldBubble();
    if (this.state !== 'running') return;

    // HUD sync (~12 Hz)
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.08;
      const powers = [...this.powers].map(([id, remaining]) => ({ id, remaining, duration: POWER_BY_ID[id].duration }));
      const def = ENV_BY_ID[this.env];
      const idx = ENV_ORDER.indexOf(this.env);
      const next = ENVIRONMENTS[idx + 1];
      const envProgress = next ? (this.distance - def.startDistance) / (next.startDistance - def.startDistance) : 1;
      useRun.getState().set({
        score: Math.floor(this.score), distance: Math.floor(runDist), health: this.health, tools: this.tools,
        combo: this.combo, multiplier: this.multiplier(), env: this.env, envProgress: Math.min(1, envProgress), powers,
      });
    }
  }

  private updateShieldBubble() {
    const order: PowerId[] = ['shield', 'oversight', 'backup'];
    const active = order.find((p) => this.powers.has(p));
    this.shieldBubble.visible = !!active;
    if (active) {
      const m = this.shieldBubble.material as THREE.MeshBasicMaterial;
      m.color.setHex(POWER_BY_ID[active].color);
      const remaining = this.powers.get(active)!;
      m.opacity = remaining < 3 ? 0.08 + 0.12 * (Math.sin(this.time * 18) * 0.5 + 0.5) : 0.16 + Math.sin(this.time * 4) * 0.04;
      this.shieldBubble.rotation.y = this.time;
    }
  }

  private updateEntities(dt: number) {
    const pb = this.player.box();
    const magnet = this.powers.has('magnet');
    const auto = this.powers.has('automation');
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      let z = this.distance - e.s;

      if (!e.done) {
        if (e.kind === 'tool' || e.kind === 'power') {
          // magnet / automation attraction
          if (e.kind === 'tool' && !e.attracted) {
            if (auto && z > -9 && z < 1) e.attracted = true;
            else if (magnet && z > -13 && z < 1 && Math.abs(e.x - this.player.x) < 4.6) e.attracted = true;
          }
          if (e.attracted) {
            const k = damp(12, dt);
            e.x += (this.player.x - e.x) * k;
            e.y += (this.player.y + 1.0 - e.y) * k;
            e.s += (this.distance - e.s) * k;
            z = this.distance - e.s;
          }
          const dx = Math.abs(e.x - this.player.x);
          const dy = Math.abs(e.y - (this.player.y + (this.player.sliding ? 0.5 : 0.95)));
          if (Math.abs(z) < 0.9 && dx < 0.85 && dy < 1.05) {
            if (e.kind === 'tool') this.collectTool(e);
            else this.collectPower(e);
          }
        } else if (e.kind === 'risk') {
          const def = RISK_BY_ID[e.id];
          const b = SHAPE_BOX[def.shape];
          const overlapZ = Math.abs(z) < b.d / 2 * 0.85 + pb.hd;
          const overlapX = Math.abs(e.x - pb.x) < b.w / 2 * 0.82 + pb.hw;
          const overlapY = pb.y1 > b.y0 + 0.08 && pb.y0 < b.y0 + b.h - 0.1;
          if (overlapZ && overlapX && overlapY && this.player.invuln <= 0) this.hitRisk(e);
          else if (z > b.d / 2 + 0.6) this.avoidRisk(e);
          if (this.state !== 'running') return;
        } else if (e.kind === 'gate') {
          if (z > -0.6) {
            this.openGate(e);
            return;
          }
        }
      }

      if (z > 12) {
        this.releaseEntity(e);
        this.entities.splice(i, 1);
        continue;
      }
      if (e.done && (e.kind === 'tool' || e.kind === 'power')) continue;
      this.placeEntity(e, z, dt);
    }
  }

  /** Visual-only update (countdown / dying). */
  private updateEntitiesVisual(dt: number, _dz: number) {
    for (const e of this.entities) {
      if (e.done && (e.kind === 'tool' || e.kind === 'power')) continue;
      this.placeEntity(e, this.distance - e.s, dt);
    }
  }

  private placeEntity(e: Entity, z: number, dt: number) {
    const o = e.obj;
    if (e.kind === 'risk') {
      o.position.set(e.x, 0, z);
      if (z > -60) animateRisk(o, this.time);
    } else if (e.kind === 'gate') {
      o.position.set(0, 0, z);
      const r = refs(o);
      if (r.curtain) ((r.curtain as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(this.time * 3) * 0.05;
      if (r.sym) r.sym.rotation.z = this.time * 1.5;
    } else {
      const bob = Math.sin(this.time * 3 + e.spinOffset) * 0.08;
      o.position.set(e.x, e.y + bob, z);
      const r = refs(o);
      if (r.spin) r.spin.rotation.y += dt * 2.6;
      if (r.ring) r.ring.position.y = -e.y + 0.05 - bob;
      if (r.orbit) r.orbit.rotation.set(this.time * 2, this.time * 1.3, 0);
    }
  }

  // ------------------------------------------------------------------ camera
  private updateCamera(dt: number) {
    const desiredPos = this.tmpPos;
    const desiredLook = this.tmpLook;
    if (this.state === 'menu') {
      const sway = Math.sin(this.time * 0.18);
      desiredPos.set(2.6 + sway * 1.4, 1.9 + Math.sin(this.time * 0.11) * 0.3, -4.6);
      desiredLook.set(0, 1.15, 0.5);
    } else {
      const px = this.player.x;
      desiredPos.set(px * 0.7, 3.7 + this.player.y * 0.25, 6.6);
      desiredLook.set(px * 0.55, 1.1 + this.player.y * 0.3, -7);
      if (this.state === 'gate') {
        desiredPos.set(px * 0.5, 2.6, 4.6);
        desiredLook.set(px * 0.3, 2.2, -6);
      } else if (this.state === 'dying' || this.state === 'over') {
        desiredPos.set(px + 2.4, 2.4, -3.6);
        desiredLook.set(px, 0.5, 0.3);
      }
    }
    const k = damp(this.state === 'menu' ? 1.5 : 6, dt);
    this.camPos.lerp(desiredPos, k);
    this.camLook.lerp(desiredLook, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.trauma > 0) {
      // summed sines at unrelated rates: smooth, never a per-frame random buzz
      this.trauma = Math.max(0, this.trauma - 1.4 * dt);
      const shake = this.trauma * this.trauma;
      this.shakeT += dt * 30;
      this.camera.position.x += 0.35 * shake * Math.sin(this.shakeT * 1.7);
      this.camera.position.y += 0.22 * shake * Math.sin(this.shakeT * 2.3);
      this.camera.rotation.z += 0.05 * shake * Math.sin(this.shakeT * 1.1);
    }
    // subtle FOV kick with speed
    const portrait = this.camera.aspect < 0.8;
    const baseFov = portrait ? 74 : 60;
    const fov = baseFov + (this.state === 'running' ? Math.min(8, (this.speed - 13) * 0.4) : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * damp(2, dt);
      this.camera.updateProjectionMatrix();
    }
  }
}

/** Named-child lookup cached on the object (no per-frame tree search). */
function refs(o: THREE.Object3D): Record<string, THREE.Object3D | undefined> {
  let r = o.userData.refs as Record<string, THREE.Object3D | undefined> | undefined;
  if (!r) {
    r = {};
    for (const n of ['spin', 'ring', 'orbit', 'curtain', 'sym', 'q']) r[n] = o.getObjectByName(n);
    o.userData.refs = r;
  }
  return r;
}
