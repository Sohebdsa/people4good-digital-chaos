/**
 * Fully synthesised audio (Web Audio API) — original SFX and a procedural music sequencer.
 * No audio files are loaded, so nothing can go missing and nothing needs licensing.
 */
import { ENV_BY_ID } from '../../data/environments';
import type { EnvId } from '../../data/types';

export type Sfx =
  | 'step' | 'jump' | 'land' | 'slide' | 'lane'
  | 'chime' | 'data' | 'ai' | 'shield' | 'gear' | 'stamp'
  | 'powerup' | 'block' | 'hit' | 'gate' | 'correct' | 'wrong'
  | 'mission' | 'achievement' | 'gameover' | 'click' | 'tick' | 'go' | 'env' | 'combo';

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};
// chord progressions as scale degrees
const PROGRESSIONS: Record<string, number[]> = {
  major: [0, 4, 5, 3],
  minor: [0, 5, 2, 6],
  dorian: [0, 3, 0, 6],
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private musicVol = 0.55;
  private sfxVol = 0.8;
  private muted = false;

  // sequencer
  private seqTimer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private mode: 'off' | 'menu' | 'run' = 'off';
  private env: EnvId = 'maze';
  private pendingEnv: EnvId | null = null;
  private muffled = false;

  get ready() {
    return !!this.ctx;
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 6000;
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.musicFilter);
      this.musicFilter.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(music: number, sfx: number, muted: boolean) {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.5, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.7, t, 0.02);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // ---------------- synthesis primitives ----------------
  private tone(
    freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; attack?: number; slide?: number; delay?: number; bus?: AudioNode; filter?: number } = {},
  ) {
    if (!this.ctx) return;
    const { type = 'sine', vol = 0.3, attack = 0.005, slide, delay = 0, bus = this.sfxBus, filter } = opts;
    const t0 = this.ctx.currentTime + delay;
    this.toneAt(t0, freq, dur, { type, vol, attack, slide, bus, filter });
  }

  private toneAt(
    t0: number, freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; attack?: number; slide?: number; bus?: AudioNode; filter?: number; release?: number },
  ) {
    const ctx = this.ctx!;
    const { type = 'sine', vol = 0.3, attack = 0.005, slide, bus = this.sfxBus, filter, release } = opts;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + (release ?? 0));
    let node: AudioNode = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + (release ?? 0) + 0.05);
  }

  private noiseAt(t0: number, dur: number, opts: { vol?: number; type?: BiquadFilterType; freq?: number; q?: number; bus?: AudioNode; sweep?: number } = {}) {
    const ctx = this.ctx!;
    const { vol = 0.2, type = 'highpass', freq = 4000, q = 0.7, bus = this.sfxBus, sweep } = opts;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  private noise1(dur: number, opts: Parameters<AudioManager['noiseAt']>[2] & { delay?: number } = {}) {
    if (!this.ctx) return;
    this.noiseAt(this.ctx.currentTime + (opts.delay ?? 0), dur, opts);
  }

  play(name: Sfx) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'step':
        this.noise1(0.05, { vol: 0.07, type: 'bandpass', freq: 900 + Math.random() * 300, q: 1.2 });
        break;
      case 'jump':
        this.tone(320, 0.22, { type: 'triangle', vol: 0.22, slide: 720 });
        this.noise1(0.12, { vol: 0.05, type: 'highpass', freq: 3000 });
        break;
      case 'land':
        this.tone(140, 0.1, { type: 'sine', vol: 0.25, slide: 60 });
        this.noise1(0.08, { vol: 0.08, type: 'lowpass', freq: 800 });
        break;
      case 'slide':
        this.noise1(0.35, { vol: 0.12, type: 'bandpass', freq: 2500, sweep: 600, q: 0.8 });
        break;
      case 'lane':
        this.noise1(0.09, { vol: 0.06, type: 'bandpass', freq: 1800, sweep: 3800, q: 1 });
        break;
      case 'chime':
        this.tone(1046, 0.16, { type: 'sine', vol: 0.18 });
        this.tone(1568, 0.22, { type: 'sine', vol: 0.12, delay: 0.05 });
        break;
      case 'data':
        this.tone(880, 0.08, { type: 'square', vol: 0.07, filter: 3000 });
        this.tone(1320, 0.08, { type: 'square', vol: 0.07, filter: 3000, delay: 0.05 });
        this.tone(1760, 0.14, { type: 'square', vol: 0.06, filter: 3000, delay: 0.1 });
        break;
      case 'ai':
        this.tone(660, 0.3, { type: 'sine', vol: 0.15, slide: 1320 });
        this.tone(990, 0.3, { type: 'triangle', vol: 0.08, slide: 1980, delay: 0.04 });
        break;
      case 'shield':
        this.tone(523, 0.25, { type: 'triangle', vol: 0.16 });
        this.tone(784, 0.3, { type: 'triangle', vol: 0.12, delay: 0.06 });
        this.noise1(0.25, { vol: 0.04, type: 'highpass', freq: 6000 });
        break;
      case 'gear':
        for (let i = 0; i < 4; i++) this.noise1(0.03, { vol: 0.12, type: 'bandpass', freq: 2200, q: 4, delay: i * 0.045 });
        this.tone(1174, 0.18, { type: 'sine', vol: 0.12, delay: 0.18 });
        break;
      case 'stamp':
        this.tone(180, 0.12, { type: 'sine', vol: 0.3, slide: 70 });
        this.noise1(0.06, { vol: 0.15, type: 'lowpass', freq: 1500 });
        this.tone(1318, 0.18, { type: 'sine', vol: 0.1, delay: 0.08 });
        break;
      case 'powerup':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.15, delay: i * 0.06 }));
        break;
      case 'block':
        this.tone(900, 0.25, { type: 'triangle', vol: 0.18, slide: 300 });
        this.noise1(0.2, { vol: 0.1, type: 'highpass', freq: 5000 });
        break;
      case 'hit':
        this.tone(160, 0.35, { type: 'sawtooth', vol: 0.2, slide: 50, filter: 900 });
        this.noise1(0.3, { vol: 0.25, type: 'lowpass', freq: 1200, sweep: 200 });
        break;
      case 'gate':
        this.tone(392, 0.5, { type: 'triangle', vol: 0.14 });
        this.tone(587, 0.6, { type: 'triangle', vol: 0.1, delay: 0.12 });
        this.tone(784, 0.7, { type: 'sine', vol: 0.08, delay: 0.24 });
        break;
      case 'correct':
        [659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.16, delay: i * 0.08 }));
        break;
      case 'wrong':
        this.tone(311, 0.25, { type: 'square', vol: 0.09, filter: 1400 });
        this.tone(233, 0.4, { type: 'square', vol: 0.09, filter: 1400, delay: 0.2 });
        break;
      case 'mission':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.14, delay: i * 0.09 }));
        break;
      case 'achievement':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, { type: 'sine', vol: 0.15, delay: i * 0.1 }));
        this.noise1(0.6, { vol: 0.03, type: 'highpass', freq: 7000, delay: 0.3 });
        break;
      case 'gameover':
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.16, delay: i * 0.18 }));
        break;
      case 'click':
        this.tone(1200, 0.04, { type: 'sine', vol: 0.1 });
        break;
      case 'tick':
        this.tone(880, 0.1, { type: 'triangle', vol: 0.15 });
        break;
      case 'go':
        this.tone(1320, 0.3, { type: 'triangle', vol: 0.18 });
        this.tone(1760, 0.35, { type: 'sine', vol: 0.1, delay: 0.05 });
        break;
      case 'env':
        this.noise1(1.2, { vol: 0.06, type: 'bandpass', freq: 300, sweep: 5000, q: 0.8 });
        this.tone(523, 0.8, { type: 'sine', vol: 0.08, delay: 0.5 });
        this.tone(784, 0.9, { type: 'sine', vol: 0.06, delay: 0.6 });
        break;
      case 'combo':
        this.tone(1568, 0.1, { type: 'sine', vol: 0.1 });
        this.tone(2093, 0.14, { type: 'sine', vol: 0.08, delay: 0.05 });
        break;
    }
  }

  // ---------------- music ----------------
  startMusic(mode: 'menu' | 'run', env: EnvId) {
    if (!this.ctx) return;
    this.mode = mode;
    this.env = env;
    this.pendingEnv = null;
    if (this.seqTimer === null) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.step = 0;
      this.bar = 0;
      this.seqTimer = window.setInterval(() => this.schedule(), 25);
    }
  }

  setMusicEnv(env: EnvId) {
    if (env !== this.env) this.pendingEnv = env;
  }

  setMusicMode(mode: 'menu' | 'run') {
    this.mode = mode;
  }

  setMuffled(m: boolean) {
    if (!this.ctx || this.muffled === m) return;
    this.muffled = m;
    this.musicFilter.frequency.setTargetAtTime(m ? 700 : 6000, this.ctx.currentTime, 0.15);
  }

  stopMusic() {
    if (this.seqTimer !== null) window.clearInterval(this.seqTimer);
    this.seqTimer = null;
    this.mode = 'off';
  }

  private schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const def = ENV_BY_ID[this.env].music;
    const bpm = this.mode === 'menu' ? def.bpm - 22 : def.bpm;
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.nextTime, this.step, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) {
        this.bar += 1;
        if (this.pendingEnv) {
          this.env = this.pendingEnv;
          this.pendingEnv = null;
        }
        return; // re-read env params on next tick
      }
    }
  }

  private playStep(t: number, s: number, stepDur: number) {
    const def = ENV_BY_ID[this.env].music;
    const scale = SCALES[def.scale];
    const prog = PROGRESSIONS[def.scale];
    const degree = prog[this.bar % prog.length];
    const note = (deg: number, oct = 0) => {
      const idx = ((deg % 7) + 7) % 7;
      const o = Math.floor(deg / 7);
      return def.root + scale[idx] + 12 * (o + oct);
    };
    const chord = [note(degree), note(degree + 2), note(degree + 4)];
    const bus = this.musicBus;
    const run = this.mode === 'run';
    const cutoff = 1200 + def.bright * 3200;

    // pad on bar start
    if (s === 0) {
      for (const n of chord) this.toneAt(t, mtof(n), stepDur * 15, { type: 'triangle', vol: run ? 0.035 : 0.05, attack: 0.25, bus, filter: 1600 });
    }
    // bass
    const bassSteps = run ? [0, 3, 6, 8, 11, 14] : [0, 8];
    if (bassSteps.includes(s)) {
      const n = s === 14 ? chord[1] - 24 : chord[0] - 24;
      this.toneAt(t, mtof(n), stepDur * (run ? 1.6 : 6), { type: 'triangle', vol: 0.16, attack: 0.01, bus, filter: 600 });
    }
    // arpeggio
    const arpEvery = run ? 1 : 2;
    if (s % arpEvery === 0) {
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      const idx = pattern[(s / arpEvery) % pattern.length];
      const oct = s >= 8 && this.bar % 2 === 1 ? 1 : 0;
      this.toneAt(t, mtof(chord[idx] + 12 + 12 * oct), stepDur * 0.9, { type: def.wave, vol: def.wave === 'sawtooth' ? 0.03 : 0.045, bus, filter: cutoff });
    }
    // lead motif every other bar
    if (run && this.bar % 4 === 3 && (s === 0 || s === 6 || s === 10)) {
      const n = chord[(s / 2) % 3] + 24;
      this.toneAt(t, mtof(n), stepDur * 3, { type: 'sine', vol: 0.05, bus, attack: 0.02 });
    }
    if (!run) return;
    // drums
    if (s % 4 === 0) {
      this.toneAt(t, 150, 0.12, { type: 'sine', vol: 0.32, slide: 45, bus });
    }
    if (s === 4 || s === 12) this.noiseAt(t, 0.14, { vol: 0.12, type: 'bandpass', freq: 1800, q: 0.9, bus });
    if (s % 2 === 1) this.noiseAt(t, 0.03, { vol: 0.05, type: 'highpass', freq: 8000, bus });
  }
}

export const audio = new AudioManager();
