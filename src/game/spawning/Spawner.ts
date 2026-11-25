import { RISK_BY_ID } from '../../data/risks';
import { envForDistance } from '../../data/environments';
import type { EnvDef, PowerId, RiskShape } from '../../data/types';
import { POWERS } from '../../data/tools';

export type Plan =
  | { kind: 'risk'; id: string; lane: number; s: number }
  | { kind: 'tool'; id: string; lane: number; s: number; y: number }
  | { kind: 'power'; id: PowerId; lane: number; s: number }
  | { kind: 'gate'; s: number };

const GATE_FIRST = 330;
const GATE_EVERY = 540;

function weighted<T extends string>(weights: Record<T, number>): T {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0] as T;
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pure pattern generator. Guarantees fairness:
 *  - every row has at least one lane that is empty or passable by jump/slide
 *  - minimum reaction gap scales with speed
 *  - no risks inside a decision-gate clearance zone
 */
export class Spawner {
  private nextRow = 0;
  private prevRow = 0;
  private nextPower = 0;
  nextGate = 0;
  private gatesEnabled = true;
  private lastPower: PowerId | null = null;
  /** One tool type at a time: keep it until toolUntil, then leave a gap before the next type. */
  private curTool: string | null = null;
  private toolUntil = 0;
  private toolEnd = -Infinity;

  reset(startS: number, gates = true) {
    this.prevRow = startS + 20;
    this.nextRow = startS + 46;
    this.nextPower = startS + 180 + Math.random() * 120;
    this.nextGate = startS + GATE_FIRST;
    this.gatesEnabled = gates;
    this.lastPower = null;
    this.curTool = null;
    this.toolUntil = 0;
    this.toolEnd = -Infinity;
  }

  /**
   * The tool type for a collectible line from start to end, or null to leave this stretch empty.
   * Every line holds a single type, and a new type only appears once the runner has had
   * time (~3 s) to read the toast for the previous one, so item toasts never stack up.
   */
  private toolFor(env: EnvDef, start: number, end: number, speed: number): string | null {
    const keep = this.curTool !== null && start <= this.toolUntil && (env.toolWeights[this.curTool] ?? 0) > 0;
    if (!keep) {
      const next = weighted(env.toolWeights);
      if (next !== this.curTool) {
        if (this.curTool !== null && start < this.toolEnd + Math.max(speed * 3, 35)) return null;
        this.curTool = next;
      }
      this.toolUntil = start + 110 + Math.random() * 70;
    }
    this.toolEnd = Math.max(this.toolEnd, end);
    return this.curTool;
  }

  private pickRisk(env: EnvDef, d: number, exclude?: RiskShape): string | null {
    const maxDiff = 1.4 + d * 2.2;
    const options = env.risks.filter((id) => {
      const r = RISK_BY_ID[id];
      return r.difficulty <= maxDiff && r.shape !== exclude;
    });
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  generate(distance: number, d: number, speed: number, out: Plan[]) {
    const horizon = distance + 160;
    while (this.nextRow < horizon) {
      const s = this.nextRow;
      const env = envForDistance(s);

      // gate
      if (this.gatesEnabled && s > this.nextGate - 28) {
        if (this.nextGate < horizon) {
          out.push({ kind: 'gate', s: this.nextGate });
          // a reward line leading into the gate
          const lane = Math.floor(Math.random() * 3);
          const id = this.toolFor(env, this.nextGate - 22, this.nextGate - 10, speed);
          if (id) for (let k = 0; k < 5; k++) out.push({ kind: 'tool', id, lane, s: this.nextGate - 22 + k * 3, y: 1 });
          this.prevRow = this.nextGate + 6;
          this.nextRow = this.nextGate + 32;
          this.nextGate += GATE_EVERY;
          continue;
        }
        break; // wait until the gate enters the horizon
      }

      // row of risks
      const r = Math.random();
      let count = r < 0.55 - 0.3 * d ? 1 : r < 0.93 - 0.18 * d ? 2 : 3;
      const lanes = shuffle([0, 1, 2]).slice(0, count);
      const row: { lane: number; id: string; shape: RiskShape }[] = [];
      for (const lane of lanes) {
        const id = this.pickRisk(env, d);
        if (id) row.push({ lane, id, shape: RISK_BY_ID[id].shape });
      }
      if (row.length === 3 && row.every((x) => x.shape === 'wall')) {
        const alt = this.pickRisk(env, d, 'wall');
        const i = Math.floor(Math.random() * 3);
        if (alt) row[i] = { lane: row[i].lane, id: alt, shape: RISK_BY_ID[alt].shape };
        else row.pop();
      }
      count = row.length;
      for (const it of row) out.push({ kind: 'risk', id: it.id, lane: it.lane, s });

      // collectibles between previous row and this one
      const occupied = new Set(row.map((x) => x.lane));
      const free = [0, 1, 2].filter((l) => !occupied.has(l));
      const lowRisk = row.find((x) => x.shape === 'low');
      const arcId = lowRisk && Math.random() < 0.3 ? this.toolFor(env, s - 5, s + 5, speed) : null;
      if (lowRisk && arcId) {
        // arc over a low risk — teaches jumping
        const id = arcId;
        for (let k = -2; k <= 2; k++) {
          const f = k / 2.6;
          out.push({ kind: 'tool', id, lane: lowRisk.lane, s: s + k * 2.4, y: 1 + 1.7 * (1 - f * f) });
        }
      } else if (Math.random() < 0.8) {
        const lane = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * 3);
        const start = this.prevRow + 5;
        const end = s - 5;
        const id = this.toolFor(env, start, end, speed);
        if (id) for (let z = start; z <= end; z += 2.6) out.push({ kind: 'tool', id, lane, s: z, y: 1 });
      }

      // power-up
      if (s > this.nextPower && free.length) {
        const opts = POWERS.filter((p) => p.id !== this.lastPower);
        const p = opts[Math.floor(Math.random() * opts.length)];
        this.lastPower = p.id;
        out.push({ kind: 'power', id: p.id, lane: free[0], s: s - Math.min(8, (s - this.prevRow) / 2) });
        this.nextPower = s + 260 + Math.random() * 160;
      }

      this.prevRow = s;
      const reaction = 1.3 - 0.62 * d; // seconds between rows
      let gap = Math.max(speed * reaction, 15) + Math.random() * 7;
      if (count === 3) gap += 4;
      this.nextRow = s + gap;
    }
  }
}
