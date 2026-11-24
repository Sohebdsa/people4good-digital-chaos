import { create } from 'zustand';
import type { EnvId, PowerId, ScenarioDef } from '../data/types';

export type RunPhase = 'idle' | 'countdown' | 'running' | 'paused' | 'gate' | 'dying' | 'over';

export interface ActivePower {
  id: PowerId;
  remaining: number;
  duration: number;
}

export interface Toast {
  id: number;
  kind: 'risk' | 'tool' | 'power' | 'mission' | 'achievement' | 'env' | 'info';
  title: string;
  text: string;
  color?: string;
  /** sprite path relative to assets/sprites, e.g. 'items/database' */
  icon?: string;
}

export interface RunSummary {
  score: number;
  distance: number;
  tools: number;
  risksAvoided: number;
  risksHit: number;
  gatesSeen: number;
  gatesCorrect: number;
  missionsCompleted: string[];
  achievementsUnlocked: string[];
  toolCounts: Record<string, number>;
  riskHits: Record<string, number>;
  riskAvoids: Record<string, number>;
  gateResults: { scenarioId: string; correct: boolean }[];
  envsReached: EnvId[];
  newBest: boolean;
  best: number;
}

export interface GateState {
  scenario: ScenarioDef;
  order: number[]; // shuffled option indices
  chosen: number | null; // original option index
  protectedByOversight: boolean;
}

interface RunState {
  phase: RunPhase;
  countdown: number;
  score: number;
  distance: number;
  health: number;
  maxHealth: number;
  tools: number;
  combo: number;
  multiplier: number;
  env: EnvId;
  envProgress: number;
  powers: ActivePower[];
  toasts: Toast[];
  gate: GateState | null;
  summary: RunSummary | null;
  missionLabel: string;
  missionProgress: number;
  missionDetail: string;
  hint: string | null;
  hitFlash: number;
  set: (p: Partial<RunState>) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dropToast: (id: number) => void;
}

let toastId = 0;

export const useRun = create<RunState>((set, get) => ({
  phase: 'idle',
  countdown: 0,
  score: 0,
  distance: 0,
  health: 3,
  maxHealth: 3,
  tools: 0,
  combo: 0,
  multiplier: 1,
  env: 'maze',
  envProgress: 0,
  powers: [],
  toasts: [],
  gate: null,
  summary: null,
  missionLabel: '',
  missionProgress: 0,
  missionDetail: '',
  hint: null,
  hitFlash: 0,
  set: (p) => set(p),
  pushToast: (t) => {
    const id = ++toastId;
    const toasts = [...get().toasts, { ...t, id }].slice(-4);
    set({ toasts });
    window.setTimeout(() => get().dropToast(id), t.kind === 'mission' || t.kind === 'achievement' || t.kind === 'env' ? 3600 : 2400);
  },
  dropToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));
