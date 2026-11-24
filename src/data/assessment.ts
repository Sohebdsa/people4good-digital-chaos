export interface AssessmentCategory {
  id: string;
  name: string;
  weight: number; // percent
  color: string;
  questions: string[];
  strength: string;
  improve: string;
  nextSteps: string[];
}

export const SCALE = [
  { value: 0, label: 'Not yet' },
  { value: 1, label: 'Just starting' },
  { value: 2, label: 'Partly' },
  { value: 3, label: 'Mostly' },
  { value: 4, label: 'Fully in place' },
];

export const ASSESSMENT: AssessmentCategory[] = [
  {
    id: 'infrastructure', name: 'Digital Infrastructure', weight: 15, color: '#3a86ff',
    questions: [
      'Do staff have reliable access to the devices they need for their work?',
      'Is internet connectivity adequate for daily work in offices (and planned for in the field)?',
      'Does the organisation use shared, organisation-managed accounts (e.g. email, cloud storage)?',
      'Are devices kept updated and protected (updates, antivirus, screen locks)?',
      'Is there a named person or partner responsible for IT support?',
    ],
    strength: 'Your team has a solid technical foundation to build on.',
    improve: 'Basic devices, accounts and support are limiting what your team can do.',
    nextSteps: ['Inventory devices and accounts', 'Move to organisation-managed accounts', 'Name an IT focal point or support partner'],
  },
  {
    id: 'data', name: 'Data Management', weight: 20, color: '#2bb3a3',
    questions: [
      'Are beneficiary records maintained digitally (or digitised promptly from paper)?',
      'Does the organisation have a centralised database or single source of truth?',
      'Are duplicate records identified and resolved?',
      'Are data quality checks performed regularly?',
      'Are backups maintained and restoration tested?',
    ],
    strength: 'Your data is structured, trusted and protected against loss.',
    improve: 'Fragmented or unchecked data is costing time and reliability.',
    nextSteps: ['Standardise beneficiary record fields and unique IDs', 'Consolidate into one central system', 'Set up and test backups'],
  },
  {
    id: 'ai', name: 'AI Adoption', weight: 20, color: '#9b5de5',
    questions: [
      'Are employees using AI tools to support their work in useful ways?',
      'Has the organisation approved specific AI tools/accounts?',
      'Are AI outputs reviewed by a person before they are used?',
      'Does the organisation have written AI usage guidelines?',
      'Have employees been trained in responsible AI use?',
    ],
    strength: 'AI is used purposefully, with guidance and review.',
    improve: 'AI use is either untapped or happening without guidance.',
    nextSteps: ['Write one-page AI usage guidelines', 'Approve a small set of AI tools', 'Run a responsible-AI training session'],
  },
  {
    id: 'privacy', name: 'Data Privacy & Security', weight: 20, color: '#e76f51',
    questions: [
      'Is there a documented data privacy / protection policy?',
      'Are appropriate notices given and consents obtained where required?',
      'Are access permissions defined by role and reviewed?',
      'Is sensitive data protected (encryption, MFA, strong passwords)?',
      'Are file-sharing permissions reviewed regularly?',
    ],
    strength: 'Beneficiary information is handled with care and protection.',
    improve: 'Personal data may be exposed through gaps in policy or access control.',
    nextSteps: ['Draft or update the privacy policy', 'Enable multi-factor authentication', 'Audit file-sharing links and access rights'],
  },
  {
    id: 'automation', name: 'Automation & Productivity', weight: 10, color: '#f3722c',
    questions: [
      'Have repetitive manual processes been identified?',
      'Are any routine workflows automated (e.g. notifications, data transfer)?',
      'Are reports generated from source data rather than re-typed?',
      'Do staff use collaboration tools effectively (shared documents, calendars)?',
      'Are automated workflows monitored and their outputs checked?',
    ],
    strength: 'Your team saves time through well-managed automation.',
    improve: 'Repetitive work is consuming time that could go to programmes.',
    nextSteps: ['List the top five repetitive tasks', 'Pilot one small automation', 'Connect one report to its data source'],
  },
  {
    id: 'strategy', name: 'Digital Strategy & Roadmap', weight: 15, color: '#ffb627',
    questions: [
      'Does leadership actively support digital improvement?',
      'Is there a written digital plan or roadmap with priorities?',
      'Is budget allocated for digital tools, training and maintenance?',
      'Are staff digital skills assessed and developed?',
      'Are digital initiatives evaluated against clear success measures?',
    ],
    strength: 'Digital change is planned, resourced and led.',
    improve: 'Digital efforts are ad-hoc and depend on individuals.',
    nextSteps: ['Agree three digital priorities with leadership', 'Draft a simple digital action plan', 'Include digital costs in budgets and proposals'],
  },
];

export const ASSESSMENT_DISCLAIMER =
  'This is an educational self-assessment to support reflection and planning. It is not an independent audit or certified maturity rating, and it does not constitute legal advice.';

export type Answers = Record<string, (number | null)[]>;

export function emptyAnswers(): Answers {
  return Object.fromEntries(ASSESSMENT.map((c) => [c.id, c.questions.map(() => null)]));
}

export function categoryScore(answers: Answers, id: string): number {
  const arr = answers[id] ?? [];
  const cat = ASSESSMENT.find((c) => c.id === id)!;
  const total = cat.questions.length * 4;
  const sum = arr.reduce<number>((s, v) => s + (v ?? 0), 0);
  return Math.round((sum / total) * 100);
}

export function overallScore(answers: Answers): number {
  let s = 0;
  for (const c of ASSESSMENT) s += categoryScore(answers, c.id) * (c.weight / 100);
  return Math.round(s);
}

export function isComplete(answers: Answers): boolean {
  return ASSESSMENT.every((c) => (answers[c.id] ?? []).every((v) => v !== null && v !== undefined));
}

export function maturityLevel(score: number): { name: string; description: string } {
  if (score < 20) return { name: 'Starting Out', description: 'Digital practices are mostly informal. Small, focused steps will make a big difference.' };
  if (score < 40) return { name: 'Emerging', description: 'Some good practices exist but they are inconsistent across the organisation.' };
  if (score < 60) return { name: 'Developing', description: 'Foundations are in place. Focus on connecting systems and formalising policies.' };
  if (score < 80) return { name: 'Established', description: 'Digital practices are consistent. Focus on optimisation, governance and skills.' };
  return { name: 'Leading', description: 'Digital and responsible AI practices are embedded. Keep reviewing and sharing what works.' };
}
