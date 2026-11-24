export type EnvId = 'maze' | 'sheets' | 'security' | 'ai' | 'city';

/** A = data management, B = privacy & security, C = AI adoption & governance */
export type RiskCategory = 'data' | 'privacy' | 'ai';

/** low = jump over, high = slide under, wall = change lane */
export type RiskShape = 'low' | 'high' | 'wall';

export interface RiskDef {
  id: string;
  num: number;
  name: string;
  category: RiskCategory;
  shape: RiskShape;
  visual: string;
  message: string;
  detail: string;
  difficulty: 1 | 2 | 3;
  envs: EnvId[];
}

export type ToolGroup = 'data' | 'ai' | 'automation' | 'privacy' | 'governance';

export interface ToolDef {
  id: string;
  name: string;
  group: ToolGroup;
  points: number;
  message: string;
  detail: string;
  examples: string;
  color: number;
  sound: 'chime' | 'data' | 'ai' | 'shield' | 'gear' | 'stamp';
}

export type PowerId = 'shield' | 'boost' | 'automation' | 'magnet' | 'backup' | 'oversight';

export interface PowerDef {
  id: PowerId;
  name: string;
  short: string;
  description: string;
  lesson: string;
  duration: number; // seconds, protective powers expire if unused
  color: number;
}

export interface ScenarioOption {
  text: string;
  correct: boolean;
  feedback: string;
}

export interface ScenarioDef {
  id: string;
  title: string;
  topic: string;
  situation: string;
  question: string;
  options: ScenarioOption[];
  explanation: string;
  learnMore: string; // learning-center article id
}

export interface EnvDef {
  id: EnvId;
  name: string;
  tagline: string;
  theme: string;
  startDistance: number;
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  ground: number;
  track: number;
  trackLine: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  risks: string[];
  toolWeights: Record<string, number>;
  music: { root: number; scale: 'major' | 'minor' | 'dorian'; bpm: number; wave: OscillatorType; bright: number };
}
