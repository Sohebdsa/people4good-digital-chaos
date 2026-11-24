import { create } from 'zustand';
import { load, save } from '../systems/persistence';
import { emptyAnswers, type Answers } from '../data/assessment';
import { emptyWorkshop, type WorkshopState } from '../data/workshop';
import type { EnvId } from '../data/types';

export type Screen =
  | 'menu'
  | 'play-select'
  | 'game'
  | 'learning'
  | 'assessment'
  | 'workshop'
  | 'missions'
  | 'achievements'
  | 'settings'
  | 'summary'
  | 'leaderboard'
  | 'login';

export interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
  quality: 'high' | 'low';
  reduceMotion: boolean;
  showHints: boolean;
  /** which rendered sprite set the UI uses */
  spriteStyle: 'realistic' | 'illustrated';
  /** last nickname used on the leaderboard (optional, stays on this device) */
  playerName: string;
  /** has seen the optional sign-in page once */
  welcomed: boolean;
  /** the one-time "what's your name?" pop-up has been shown */
  namePrompted: boolean;
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
  /** optional, only printed on the results PDF */
  orgName: string;
}

export interface RunRequest {
  env: EnvId;
  gates?: string[];
  workshopDay?: number;
}

const defaultSettings: Settings = { music: 0.55, sfx: 0.8, muted: false, quality: 'high', reduceMotion: false, showHints: true, spriteStyle: 'realistic', playerName: '', welcomed: false, namePrompted: false };
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
  workshop: WorkshopState;
  runRequest: RunRequest;
  /** run waiting for the one-time name pop-up */
  pendingRun: RunRequest | null;
  setScreen: (s: Screen, returnTo?: Screen) => void;
  openArticle: (id: string | null) => void;
  updateSettings: (p: Partial<Settings>) => void;
  updateProfile: (fn: (p: Profile) => Profile) => void;
  setAssessment: (a: Partial<AssessmentState>) => void;
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
  assessment: load('assessment', { answers: emptyAnswers(), focus: [], completedAt: null, orgName: '' } as AssessmentState),
  workshop: load('workshop', emptyWorkshop()),
  runRequest: { env: 'maze' },
  pendingRun: null,
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
  setWorkshop: (fn) => {
    const workshop = fn(get().workshop);
    save('workshop', workshop);
    set({ workshop });
  },
  startRun: (runRequest) => set({ runRequest, screen: 'game' }),
  resetProgress: () => {
    const profile = { ...defaultProfile };
    const assessment = { answers: emptyAnswers(), focus: [], completedAt: null, orgName: '' };
    const workshop = emptyWorkshop();
    save('profile', profile);
    save('assessment', assessment);
    save('workshop', workshop);
    set({ profile, assessment, workshop });
  },
}));

/** Ensure counters dict exists even with old saves. */
export function lifetimeCounters(): Record<string, number> {
  return useApp.getState().profile.counters ?? {};
}
