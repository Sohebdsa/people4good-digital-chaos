import { create } from 'zustand';
import { load, save } from '../systems/persistence';
import { emptyAnswers, type Answers } from '../data/assessment';
import type { RoadmapItem } from '../data/roadmap';
import { emptyWorkshop, type WorkshopState } from '../data/workshop';
import type { EnvId } from '../data/types';

export type Screen =
  | 'menu'
  | 'play-select'
  | 'game'
  | 'learning'
  | 'assessment'
  | 'roadmap'
  | 'workshop'
  | 'missions'
  | 'achievements'
  | 'settings'
  | 'summary';

export interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
  quality: 'high' | 'low';
  reduceMotion: boolean;
  showHints: boolean;
  /** which rendered sprite set the UI uses */
  spriteStyle: 'realistic' | 'illustrated';
}

export interface Profile {
  best: number;
  bestDistance: number;
  impact: number;
  runs: number;
  counters: Record<string, number>;
  unlockedEnvs: EnvId[];
  discoveredRisks: string[];
  discoveredTools: string[];
  missionsDone: string[];
  achievements: string[];
  focusMission: string | null;
  tutorialSeen: boolean;
}

export interface AssessmentState {
  answers: Answers;
  focus: string[];
  completedAt: string | null;
}

export interface RoadmapState {
  orgName: string;
  items: RoadmapItem[];
  createdAt: string | null;
}

export interface RunRequest {
  env: EnvId;
  gates?: string[];
  workshopDay?: number;
}

const defaultSettings: Settings = { music: 0.55, sfx: 0.8, muted: false, quality: 'high', reduceMotion: false, showHints: true, spriteStyle: 'realistic' };
const defaultProfile: Profile = {
  best: 0, bestDistance: 0, impact: 0, runs: 0, counters: {}, unlockedEnvs: ['maze'], discoveredRisks: [], discoveredTools: [],
  missionsDone: [], achievements: [], focusMission: null, tutorialSeen: false,
};

interface AppState {
  screen: Screen;
  returnTo: Screen;
  articleId: string | null;
  settings: Settings;
  profile: Profile;
  assessment: AssessmentState;
  roadmap: RoadmapState;
  workshop: WorkshopState;
  runRequest: RunRequest;
  setScreen: (s: Screen, returnTo?: Screen) => void;
  openArticle: (id: string | null) => void;
  updateSettings: (p: Partial<Settings>) => void;
  updateProfile: (fn: (p: Profile) => Profile) => void;
  setAssessment: (a: Partial<AssessmentState>) => void;
  setRoadmap: (r: Partial<RoadmapState>) => void;
  setWorkshop: (fn: (w: WorkshopState) => WorkshopState) => void;
  startRun: (req: RunRequest) => void;
  resetProgress: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  screen: 'menu',
  returnTo: 'menu',
  articleId: null,
  settings: load('settings', defaultSettings),
  profile: load('profile', defaultProfile),
  assessment: load('assessment', { answers: emptyAnswers(), focus: [], completedAt: null } as AssessmentState),
  roadmap: load('roadmap', { orgName: '', items: [], createdAt: null } as RoadmapState),
  workshop: load('workshop', emptyWorkshop()),
  runRequest: { env: 'maze' },
  setScreen: (screen, returnTo) => set({ screen, returnTo: returnTo ?? get().returnTo }),
  openArticle: (articleId) => set({ articleId }),
  updateSettings: (p) => {
    const settings = { ...get().settings, ...p };
    save('settings', settings);
    set({ settings });
  },
  updateProfile: (fn) => {
    const profile = fn(get().profile);
    save('profile', profile);
    set({ profile });
  },
  setAssessment: (a) => {
    const assessment = { ...get().assessment, ...a };
    save('assessment', assessment);
    set({ assessment });
  },
  setRoadmap: (r) => {
    const roadmap = { ...get().roadmap, ...r };
    save('roadmap', roadmap);
    set({ roadmap });
  },
  setWorkshop: (fn) => {
    const workshop = fn(get().workshop);
    save('workshop', workshop);
    set({ workshop });
  },
  startRun: (runRequest) => set({ runRequest, screen: 'game' }),
  resetProgress: () => {
    const profile = { ...defaultProfile };
    const assessment = { answers: emptyAnswers(), focus: [], completedAt: null };
    const roadmap = { orgName: '', items: [], createdAt: null };
    const workshop = emptyWorkshop();
    save('profile', profile);
    save('assessment', assessment);
    save('roadmap', roadmap);
    save('workshop', workshop);
    set({ profile, assessment, roadmap, workshop });
  },
}));

/** Ensure counters dict exists even with old saves. */
export function lifetimeCounters(): Record<string, number> {
  return useApp.getState().profile.counters ?? {};
}
