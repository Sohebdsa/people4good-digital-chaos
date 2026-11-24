import type { EnvDef, EnvId } from './types';

export const ENVIRONMENTS: EnvDef[] = [
  {
    id: 'maze', name: 'The Manual Maze', tagline: 'Paper everywhere. Nothing connects.',
    theme: 'Traditional operational inefficiencies',
    startDistance: 0,
    sky: 0xe8c9a0, fog: 0xd9b98f, fogNear: 30, fogFar: 120,
    ground: 0x8a6a4a, track: 0xb08a5e, trackLine: 0xe9d6b4,
    sun: 0xffd9a6, sunIntensity: 2.3, hemiSky: 0xfff0d8, hemiGround: 0x6b4a30, hemiIntensity: 1.0,
    risks: ['paper_forms', 'missing_info', 'manual_reports', 'no_backup', 'no_retention'],
    toolWeights: { digital_form: 6, cloud: 3, database: 2, backup_vault: 2, dashboard: 1, roadmap: 0.4 },
    music: { root: 57, scale: 'dorian', bpm: 112, wave: 'triangle', bright: 0.4 },
  },
  {
    id: 'sheets', name: 'Spreadsheet City', tagline: 'A thousand versions of the truth.',
    theme: 'Fragmented data management',
    startDistance: 650,
    sky: 0xcfe8d6, fog: 0xbcdcc6, fogNear: 30, fogFar: 125,
    ground: 0x3f6f57, track: 0xe9f2ec, trackLine: 0x2e8b57,
    sun: 0xffffff, sunIntensity: 2.5, hemiSky: 0xeafff2, hemiGround: 0x2b4d3c, hemiIntensity: 1.0,
    risks: ['scattered_sheets', 'duplicates', 'missing_info', 'no_central_db', 'no_backup'],
    toolWeights: { database: 5, dashboard: 4, cloud: 3, digital_form: 2, backup_vault: 2, automation: 1, roadmap: 0.4 },
    music: { root: 60, scale: 'major', bpm: 118, wave: 'square', bright: 0.55 },
  },
  {
    id: 'security', name: 'Data Security District', tagline: 'Every door is a decision.',
    theme: 'Privacy and cybersecurity',
    startDistance: 1400,
    sky: 0x1d2147, fog: 0x232a5c, fogNear: 25, fogFar: 110,
    ground: 0x1a1d38, track: 0x3a4170, trackLine: 0xffb627,
    sun: 0xb8c4ff, sunIntensity: 1.6, hemiSky: 0x6a78d1, hemiGround: 0x101225, hemiIntensity: 1.1,
    risks: ['public_ai_upload', 'no_privacy_policy', 'no_consent', 'weak_passwords', 'shared_logins', 'unauthorised_access', 'no_retention', 'public_links'],
    toolWeights: { privacy_shield: 5, strong_password: 5, consent: 4, backup_vault: 2, cloud: 1, roadmap: 0.4 },
    music: { root: 52, scale: 'minor', bpm: 122, wave: 'sawtooth', bright: 0.3 },
  },
  {
    id: 'ai', name: 'AI Frontier', tagline: 'Powerful tools. Real responsibility.',
    theme: 'Artificial intelligence and automation',
    startDistance: 2250,
    sky: 0x5b3a7a, fog: 0x8b5e9b, fogNear: 30, fogFar: 125,
    ground: 0x2c1f4a, track: 0x4b3a78, trackLine: 0x5ef2ff,
    sun: 0xffc6a8, sunIntensity: 2.0, hemiSky: 0xe0b3ff, hemiGround: 0x24163a, hemiIntensity: 1.05,
    risks: ['public_ai_upload', 'copy_paste_ai', 'hallucination', 'no_ai_guidelines', 'ai_bias', 'no_human_review'],
    toolWeights: { ai_assistant: 5, ai_research: 4, ai_design: 3, automation: 3, human_review: 3, ai_policy: 3, roadmap: 0.5 },
    music: { root: 55, scale: 'dorian', bpm: 126, wave: 'sawtooth', bright: 0.6 },
  },
  {
    id: 'city', name: 'Responsible Innovation City', tagline: 'Connected, careful, and built for people.',
    theme: 'A digitally mature, responsible NGO',
    startDistance: 3200,
    sky: 0xbfe6ff, fog: 0xd7efff, fogNear: 40, fogFar: 140,
    ground: 0x7fb069, track: 0xf4efe2, trackLine: 0x1fb5a8,
    sun: 0xfff3d6, sunIntensity: 2.7, hemiSky: 0xffffff, hemiGround: 0x4f7a43, hemiIntensity: 1.1,
    risks: ['paper_forms', 'scattered_sheets', 'duplicates', 'missing_info', 'no_central_db', 'manual_reports', 'no_backup',
      'public_ai_upload', 'no_privacy_policy', 'no_consent', 'weak_passwords', 'shared_logins', 'unauthorised_access', 'no_retention', 'public_links',
      'copy_paste_ai', 'hallucination', 'no_ai_guidelines', 'ai_bias', 'no_human_review'],
    toolWeights: { digital_form: 2, database: 2, cloud: 2, dashboard: 2, ai_assistant: 2, ai_research: 2, ai_design: 2, automation: 2,
      privacy_shield: 2, consent: 2, strong_password: 2, human_review: 2, ai_policy: 2, backup_vault: 2, roadmap: 1.2 },
    music: { root: 62, scale: 'major', bpm: 124, wave: 'triangle', bright: 0.8 },
  },
];

export const ENV_BY_ID: Record<EnvId, EnvDef> = Object.fromEntries(ENVIRONMENTS.map((e) => [e.id, e])) as Record<EnvId, EnvDef>;
export const ENV_ORDER: EnvId[] = ENVIRONMENTS.map((e) => e.id);

/** Environment for a given absolute distance, given the starting env offset. */
export function envForDistance(d: number): EnvDef {
  let cur = ENVIRONMENTS[0];
  for (const e of ENVIRONMENTS) if (d >= e.startDistance) cur = e;
  return cur;
}
