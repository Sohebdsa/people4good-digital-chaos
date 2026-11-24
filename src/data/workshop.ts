import type { EnvId } from './types';

export interface WorkshopActivity {
  label: string;
  description: string;
  kind: 'run' | 'link';
  env?: EnvId;
  gates?: string[]; // scenario ids prioritised for the run
  screen?: 'assessment' | 'roadmap' | 'learning' | 'missions';
  assessmentCategory?: string;
}

export interface WorkshopOutput {
  id: string;
  label: string;
  kind: 'problems' | 'tools' | 'assessment' | 'experiment' | 'automation' | 'roadmap' | 'priorities';
  assessmentCategories?: string[];
}

export interface WorkshopDay {
  day: number;
  title: string;
  subtitle: string;
  color: string;
  objectives: string[];
  activities: WorkshopActivity[];
  outputs: WorkshopOutput[];
  discussion: string[];
}

export const WORKSHOP_DAYS: WorkshopDay[] = [
  {
    day: 1, title: 'Understanding Digital Chaos', subtitle: 'Where are we today?', color: '#ffb627',
    objectives: [
      'Understand existing operational challenges.',
      'Identify data management gaps.',
      'Discover digital tools.',
      'Identify repetitive manual processes.',
    ],
    activities: [
      { label: 'Run: The Manual Maze', description: 'Experience paper chaos, missing data and manual reporting.', kind: 'run', env: 'maze', gates: ['offline', 'backup', 'duplicates'] },
      { label: 'Run: Spreadsheet City', description: 'Navigate scattered sheets and duplicate records.', kind: 'run', env: 'sheets', gates: ['duplicates', 'automation', 'backup'] },
      { label: 'Mission focus: Escape the Paper Maze', description: 'Track your Digital Data Collection mission.', kind: 'link', screen: 'missions' },
    ],
    outputs: [
      { id: 'd1_problems', label: 'NGO problem identification', kind: 'problems' },
      { id: 'd1_data', label: 'Data management assessment', kind: 'assessment', assessmentCategories: ['infrastructure', 'data'] },
      { id: 'd1_tools', label: 'Digital tools discovery', kind: 'tools' },
    ],
    discussion: [
      'Which obstacle felt most familiar? Where does it appear in your organisation?',
      'Where do you type the same information more than once?',
      'Which report takes the longest to prepare, and why?',
    ],
  },
  {
    day: 2, title: 'Responsible AI Adoption', subtitle: 'Using AI safely and usefully', color: '#9b5de5',
    objectives: [
      'Understand AI capabilities and limits.',
      'Discover AI tools.',
      'Learn responsible AI usage.',
      'Understand privacy and governance risks.',
    ],
    activities: [
      { label: 'Run: Data Security District', description: 'Privacy challenges: consent, access, passwords, sharing.', kind: 'run', env: 'security', gates: ['public_ai', 'shared_creds', 'photos'] },
      { label: 'Run: AI Frontier', description: 'Hallucinations, bias, human oversight and AI policy gates.', kind: 'run', env: 'ai', gates: ['hallucination', 'ai_decisions', 'ai_policy'] },
      { label: 'Study: Responsible AI', description: 'Read the Responsible AI section of the Knowledge Center.', kind: 'link', screen: 'learning' },
    ],
    outputs: [
      { id: 'd2_ai', label: 'AI adoption assessment', kind: 'assessment', assessmentCategories: ['ai'] },
      { id: 'd2_privacy', label: 'Data privacy assessment', kind: 'assessment', assessmentCategories: ['privacy'] },
      { id: 'd2_experiment', label: 'AI experiment sheet', kind: 'experiment' },
      { id: 'd2_automation', label: 'Automation opportunities', kind: 'automation' },
    ],
    discussion: [
      'Which task could AI help with next week — using no personal data?',
      'Who in your organisation should review AI outputs before they are used?',
      'What should never be entered into an AI tool?',
    ],
  },
  {
    day: 3, title: 'Digital Transformation Planning', subtitle: 'From insight to a 90-day plan', color: '#1fb5a8',
    objectives: [
      'Identify priorities.',
      'Evaluate digital maturity.',
      'Design a practical adoption strategy.',
      'Create a 90-day roadmap.',
    ],
    activities: [
      { label: 'Run: Responsible Innovation City', description: 'The final transformation run — every risk, every tool.', kind: 'run', env: 'city', gates: ['automation', 'ai_policy', 'public_ai', 'ai_decisions'] },
      { label: 'Complete the maturity self-assessment', description: 'All six weighted areas.', kind: 'link', screen: 'assessment' },
      { label: 'Build your 90-day roadmap', description: 'Generate, edit and export your plan.', kind: 'link', screen: 'roadmap' },
    ],
    outputs: [
      { id: 'd3_assessment', label: 'Digital maturity assessment', kind: 'assessment', assessmentCategories: ['infrastructure', 'data', 'ai', 'privacy', 'automation', 'strategy'] },
      { id: 'd3_priorities', label: 'Prioritised improvement areas', kind: 'priorities' },
      { id: 'd3_roadmap', label: '30 / 60 / 90-day roadmap', kind: 'roadmap' },
    ],
    discussion: [
      'Which single change would most help your beneficiaries in the next 90 days?',
      'What resources or support do you need from leadership?',
      'How will you know your roadmap is working?',
    ],
  },
];

export interface ExperimentSheet {
  task: string;
  tool: string;
  data: string;
  noPersonalData: boolean;
  review: string;
  success: string;
}

export interface AutomationIdea {
  id: string;
  process: string;
  hours: string;
  idea: string;
}

export interface WorkshopState {
  problems: string[]; // risk ids marked as relevant
  problemNotes: string;
  experiment: ExperimentSheet;
  automation: AutomationIdea[];
  done: Record<string, boolean>;
}

export function emptyWorkshop(): WorkshopState {
  return {
    problems: [],
    problemNotes: '',
    experiment: { task: '', tool: '', data: '', noPersonalData: false, review: '', success: '' },
    automation: [],
    done: {},
  };
}
