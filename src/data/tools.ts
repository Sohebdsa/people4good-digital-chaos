import type { PowerDef, PowerId, ToolDef, ToolGroup } from './types';

export const TOOLS: ToolDef[] = [
  {
    id: 'digital_form', name: 'Digital Data Collection', group: 'data', points: 10, color: 0x2bb3a3, sound: 'chime',
    message: 'Collect structured information efficiently.',
    detail: 'Mobile forms with validation, skip logic and offline mode reduce transcription errors and speed up reporting.',
    examples: 'KoboToolbox, ODK and similar digital survey tools',
  },
  {
    id: 'database', name: 'Centralised Database', group: 'data', points: 15, color: 0x3a86ff, sound: 'data',
    message: 'Store organisational information in a structured system.',
    detail: 'A structured database keeps one record per beneficiary, links related information and makes reporting repeatable.',
    examples: 'PostgreSQL, MySQL or a well-configured case-management system',
  },
  {
    id: 'cloud', name: 'Cloud Storage', group: 'data', points: 10, color: 0x7cc6fe, sound: 'chime',
    message: 'Store and organise files with appropriate access controls.',
    detail: 'Shared, organised folders with clear permissions replace files scattered across personal laptops and inboxes.',
    examples: 'Google Drive and other cloud storage platforms',
  },
  {
    id: 'dashboard', name: 'Data Visualisation', group: 'data', points: 20, color: 0xffb627, sound: 'data',
    message: 'Turn organisational data into meaningful insights.',
    detail: 'Dashboards help teams and boards see trends, gaps and outcomes — when they are built on clean, trusted data.',
    examples: 'Power BI, Looker Studio',
  },
  {
    id: 'ai_assistant', name: 'AI Assistant', group: 'ai', points: 20, color: 0x9b5de5, sound: 'ai',
    message: 'Use AI to support writing, research, analysis and productivity.',
    detail: 'General AI assistants can draft, summarise and brainstorm. Use approved tools, keep personal data out, and review everything.',
    examples: 'ChatGPT, Gemini and similar assistants',
  },
  {
    id: 'ai_research', name: 'AI Research Notebook', group: 'ai', points: 25, color: 0xc77dff, sound: 'ai',
    message: 'Use AI to explore and understand your own source documents.',
    detail: 'Source-grounded AI tools answer questions from documents you provide, making it easier to check where an answer came from.',
    examples: 'NotebookLM and other source-grounded research tools',
  },
  {
    id: 'ai_design', name: 'AI Design Board', group: 'ai', points: 15, color: 0xff6f91, sound: 'ai',
    message: 'Create communication materials more efficiently.',
    detail: 'AI design features speed up posters, social posts and reports. Respect consent for any photos and keep your brand accurate.',
    examples: 'Canva AI and similar design tools',
  },
  {
    id: 'automation', name: 'Workflow Automation', group: 'automation', points: 25, color: 0xf3722c, sound: 'gear',
    message: 'Automate repetitive workflows.',
    detail: 'Connecting apps so routine steps run automatically frees hours each month. Start small, test, and monitor the output.',
    examples: 'Make, Zapier and similar automation platforms',
  },
  {
    id: 'privacy_shield', name: 'Data Privacy Shield', group: 'privacy', points: 20, color: 0x1fb5a8, sound: 'shield',
    message: 'Protect beneficiary information.',
    detail: 'Data minimisation, encryption and access control together reduce the harm if something goes wrong.',
    examples: 'Privacy-by-design practices',
  },
  {
    id: 'consent', name: 'Consent Card', group: 'privacy', points: 15, color: 0x90be6d, sound: 'stamp',
    message: 'Respect beneficiary rights.',
    detail: 'Clear notices — and consent where it is the appropriate basis — help people understand and control how their information is used.',
    examples: 'Plain-language notices and consent records',
  },
  {
    id: 'strong_password', name: 'Strong Password Key', group: 'privacy', points: 15, color: 0xffd166, sound: 'shield',
    message: 'Protect organisational accounts.',
    detail: 'Long unique passphrases, a password manager and multi-factor authentication stop most account takeovers.',
    examples: 'Password managers and MFA apps',
  },
  {
    id: 'human_review', name: 'Human Review Stamp', group: 'governance', points: 30, color: 0xe76f51, sound: 'stamp',
    message: 'Review important AI-generated information.',
    detail: 'An accountable person checks AI outputs before they influence decisions, publications or beneficiaries.',
    examples: 'Review checklists and sign-off steps',
  },
  {
    id: 'ai_policy', name: 'AI Policy Document', group: 'governance', points: 30, color: 0x577590, sound: 'stamp',
    message: 'Define how your organisation uses AI.',
    detail: 'An AI policy lists approved tools, forbidden data, review rules, disclosure and who to ask.',
    examples: 'Organisational AI usage guidelines',
  },
  {
    id: 'backup_vault', name: 'Backup Vault', group: 'data', points: 20, color: 0x4d908e, sound: 'data',
    message: 'Maintain reliable backups.',
    detail: 'Regular, encrypted, tested backups keep the organisation running after accidents or attacks.',
    examples: '3-2-1 backup routines',
  },
  {
    id: 'roadmap', name: 'Digital Roadmap', group: 'governance', points: 50, color: 0xffc93c, sound: 'chime',
    message: 'Plan digital transformation step by step.',
    detail: 'A practical roadmap sequences small, achievable steps with owners, resources and success measures.',
    examples: 'A 90-day transformation plan',
  },
];

export const TOOL_BY_ID: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export const TOOL_GROUP_LABEL: Record<ToolGroup, string> = {
  data: 'Data Systems',
  ai: 'AI Tools',
  automation: 'Automation',
  privacy: 'Privacy & Security',
  governance: 'Governance',
};

export const POWERS: PowerDef[] = [
  {
    id: 'shield', name: 'Data Protection Shield', short: 'Shield', duration: 20, color: 0x1fb5a8,
    description: 'Blocks the next data or privacy hazard you hit.',
    lesson: 'Good data protection absorbs the impact of mistakes.',
  },
  {
    id: 'boost', name: 'AI Productivity Boost', short: 'x2 Score', duration: 10, color: 0x9b5de5,
    description: 'Doubles your score multiplier for a short time.',
    lesson: 'Used well, AI multiplies what a team can achieve.',
  },
  {
    id: 'automation', name: 'Automation Boost', short: 'Auto-Collect', duration: 9, color: 0xf3722c,
    description: 'Automatically collects digital tools in every lane.',
    lesson: 'Automation handles repetitive work so people can focus.',
  },
  {
    id: 'magnet', name: 'Data Magnet', short: 'Magnet', duration: 10, color: 0x3a86ff,
    description: 'Pulls nearby collectibles towards you.',
    lesson: 'Connected systems bring information to where it is needed.',
  },
  {
    id: 'backup', name: 'Backup Shield', short: 'Backup', duration: 25, color: 0x4d908e,
    description: 'Survive any one collision and earn a recovery bonus.',
    lesson: 'Backups mean one failure is not a disaster.',
  },
  {
    id: 'oversight', name: 'Human Oversight', short: 'Oversight', duration: 30, color: 0xe76f51,
    description: 'Recover from one AI-related mistake or wrong decision.',
    lesson: 'Human review catches what AI gets wrong.',
  },
];

export const POWER_BY_ID: Record<PowerId, PowerDef> = Object.fromEntries(POWERS.map((p) => [p.id, p])) as Record<PowerId, PowerDef>;
