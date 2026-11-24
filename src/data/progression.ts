export interface Requirement {
  key: string; // counter key
  target: number;
  label: string;
}

export interface MissionDef {
  id: string;
  num: number;
  name: string;
  objective: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  scope: 'lifetime' | 'run';
  reqs: Requirement[];
  reward: number; // impact points
  lesson: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'paper_maze', num: 1, name: 'Escape the Paper Maze', difficulty: 'Easy', scope: 'lifetime', reward: 250,
    objective: 'Collect 10 Digital Data Collection tools.',
    reqs: [{ key: 'tool:digital_form', target: 10, label: 'Digital collection tools' }],
    lesson: 'Structured digital collection is the first step out of the paper maze.',
  },
  {
    id: 'clean_data', num: 2, name: 'Clean Your Data', difficulty: 'Medium', scope: 'lifetime', reward: 350,
    objective: 'Avoid 5 Duplicate Record walls and collect 8 Centralised Databases.',
    reqs: [
      { key: 'avoid:duplicates', target: 5, label: 'Duplicate walls avoided' },
      { key: 'tool:database', target: 8, label: 'Databases collected' },
    ],
    lesson: 'Unique IDs and one central system keep beneficiary data trustworthy.',
  },
  {
    id: 'protect_info', num: 3, name: 'Protect Beneficiary Information', difficulty: 'Medium', scope: 'lifetime', reward: 400,
    objective: 'Collect 6 privacy & security items and avoid 10 privacy hazards.',
    reqs: [
      { key: 'group:privacy', target: 6, label: 'Privacy items collected' },
      { key: 'avoidcat:privacy', target: 10, label: 'Privacy hazards avoided' },
    ],
    lesson: 'Protection is a habit: shields, consent and strong keys every day.',
  },
  {
    id: 'ai_ready', num: 4, name: 'Become AI Ready', difficulty: 'Medium', scope: 'lifetime', reward: 400,
    objective: 'Collect 3 AI Assistants, 2 AI Research Notebooks and 2 AI Policy Documents.',
    reqs: [
      { key: 'tool:ai_assistant', target: 3, label: 'AI assistants' },
      { key: 'tool:ai_research', target: 2, label: 'AI research notebooks' },
      { key: 'tool:ai_policy', target: 2, label: 'AI policy documents' },
    ],
    lesson: 'AI readiness means tools AND the policy that governs them.',
  },
  {
    id: 'responsible_ai', num: 5, name: 'Build Responsible AI', difficulty: 'Medium', scope: 'lifetime', reward: 450,
    objective: 'Answer 3 Decision Gates correctly.',
    reqs: [{ key: 'gate:correct', target: 3, label: 'Correct decisions' }],
    lesson: 'Responsible AI is made of everyday decisions.',
  },
  {
    id: 'automate', num: 6, name: 'Automate the NGO', difficulty: 'Hard', scope: 'lifetime', reward: 500,
    objective: 'Collect 5 Workflow Automation tools and solve the automation Decision Gate.',
    reqs: [
      { key: 'tool:automation', target: 5, label: 'Automation tools' },
      { key: 'gate:correct:automation', target: 1, label: 'Automation challenge solved' },
    ],
    lesson: 'Automate the repetitive, test the workflow, verify the output.',
  },
  {
    id: 'champion', num: 7, name: 'Digital Transformation Champion', difficulty: 'Hard', scope: 'run', reward: 750,
    objective: 'In a single run, collect tools from all five categories.',
    reqs: [
      { key: 'group:data', target: 1, label: 'Data Systems' },
      { key: 'group:ai', target: 1, label: 'AI Tools' },
      { key: 'group:automation', target: 1, label: 'Automation' },
      { key: 'group:privacy', target: 1, label: 'Privacy & Security' },
      { key: 'group:governance', target: 1, label: 'Governance' },
    ],
    lesson: 'Transformation is balanced: data, AI, automation, privacy and governance together.',
  },
];

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reqs: Requirement[];
  icon: 'compass' | 'shield' | 'spark' | 'scale' | 'gear' | 'lock' | 'star' | 'map';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'explorer', name: 'Digital Explorer', description: 'Collect 50 digital tools.', icon: 'compass',
    reqs: [{ key: 'tools', target: 50, label: 'Tools collected' }] },
  { id: 'guardian', name: 'Data Guardian', description: 'Collect 10 privacy-related items.', icon: 'shield',
    reqs: [{ key: 'group:privacy', target: 10, label: 'Privacy items' }] },
  { id: 'ai_explorer', name: 'AI Explorer', description: 'Discover 10 AI tools or concepts.', icon: 'spark',
    reqs: [{ key: 'group:ai', target: 10, label: 'AI discoveries' }] },
  { id: 'rai_champion', name: 'Responsible AI Champion', description: 'Answer five Decision Gates correctly.', icon: 'scale',
    reqs: [{ key: 'gate:correct', target: 5, label: 'Correct decisions' }] },
  { id: 'automation_master', name: 'Automation Master', description: 'Complete the "Automate the NGO" mission.', icon: 'gear',
    reqs: [{ key: 'mission:automate', target: 1, label: 'Automation mission' }] },
  { id: 'security_defender', name: 'Security Defender', description: 'Avoid 10 security-related obstacles.', icon: 'lock',
    reqs: [{ key: 'avoidcat:privacy', target: 10, label: 'Security risks avoided' }] },
  { id: 'hero', name: 'Digital Transformation Hero', description: 'Reach all five environments.', icon: 'star',
    reqs: [
      { key: 'env:maze', target: 1, label: 'Manual Maze' },
      { key: 'env:sheets', target: 1, label: 'Spreadsheet City' },
      { key: 'env:security', target: 1, label: 'Security District' },
      { key: 'env:ai', target: 1, label: 'AI Frontier' },
      { key: 'env:city', target: 1, label: 'Innovation City' },
    ] },
  { id: 'roadmap_builder', name: 'Roadmap Builder', description: 'Complete the maturity self-assessment and create a 90-day roadmap.', icon: 'map',
    reqs: [
      { key: 'flag:assessment', target: 1, label: 'Assessment completed' },
      { key: 'flag:roadmap', target: 1, label: 'Roadmap created' },
    ] },
];

export function reqProgress(reqs: Requirement[], counters: Record<string, number>) {
  let sum = 0;
  for (const r of reqs) sum += Math.min(1, (counters[r.key] ?? 0) / r.target);
  return sum / reqs.length;
}

export function reqsMet(reqs: Requirement[], counters: Record<string, number>) {
  return reqs.every((r) => (counters[r.key] ?? 0) >= r.target);
}
