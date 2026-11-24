import type { RiskDef } from './types';

export const RISKS: RiskDef[] = [
  // ---------- CATEGORY A: DATA MANAGEMENT ----------
  {
    id: 'paper_forms', num: 1, name: 'Unmanaged Paper Forms', category: 'data', shape: 'low',
    visual: 'Toppling piles of beneficiary forms and bound registers.',
    message: 'Choose the right collection method for your context.',
    detail:
      'Paper is not the problem — in low-connectivity or grassroots settings it can be the right choice. The risk is paper that is never digitised, consolidated or retrievable: data that cannot be searched, backed up or reported on. Plan how forms move from the field into a structured system, who enters them, and how they are checked and stored securely.',
    difficulty: 1, envs: ['maze', 'city'],
  },
  {
    id: 'scattered_sheets', num: 2, name: 'Scattered Excel Sheets', category: 'data', shape: 'high',
    visual: 'Disconnected spreadsheet panels drifting overhead.',
    message: 'Keep organisational data structured and accessible.',
    detail:
      'When every project keeps its own version of a spreadsheet, nobody knows which file is correct. Agree on a single source of truth, consistent column names and formats, and a shared, access-controlled location for master data.',
    difficulty: 1, envs: ['sheets', 'city'],
  },
  {
    id: 'duplicates', num: 3, name: 'Duplicate Beneficiary Records', category: 'data', shape: 'wall',
    visual: 'A wall of identical beneficiary cards.',
    message: 'Unique identifiers help prevent duplicate records.',
    detail:
      'The same person registered several times inflates reach numbers, distorts budgets and can lead to unequal service. Assign a unique ID at registration, search before creating a new record, and run a regular reconciliation to merge duplicates.',
    difficulty: 2, envs: ['sheets', 'city'],
  },
  {
    id: 'missing_info', num: 4, name: 'Missing Beneficiary Information', category: 'data', shape: 'low',
    visual: 'Half-filled forms with empty fields.',
    message: 'Accurate information leads to better reporting.',
    detail:
      'Blank or inconsistent fields make reports unreliable and hide who is being left out. Use required fields only where truly needed, validation rules (dates, phone formats, ranges) and periodic data-quality checks with feedback to field teams.',
    difficulty: 1, envs: ['maze', 'sheets', 'city'],
  },
  {
    id: 'no_central_db', num: 5, name: 'No Centralised Database', category: 'data', shape: 'wall',
    visual: 'Disconnected database cylinders with broken links.',
    message: 'Connect your data through a well-designed information system.',
    detail:
      'Without a shared system, information lives in inboxes, laptops and notebooks. A well-designed information system (it can start simple) links programmes, beneficiaries and activities so data is entered once and used many times.',
    difficulty: 2, envs: ['sheets', 'city'],
  },
  {
    id: 'manual_reports', num: 6, name: 'Manual Report Preparation', category: 'data', shape: 'high',
    visual: 'An overhead banner of endless report pages and calculators.',
    message: 'Automate repetitive reporting wherever appropriate.',
    detail:
      'Copying numbers by hand into the same report every month wastes staff time and introduces errors. Standardise indicators, connect reports to the source data, and automate the repetitive steps — while keeping a human check before anything is sent.',
    difficulty: 2, envs: ['maze', 'city'],
  },
  {
    id: 'no_backup', num: 7, name: 'No Data Backup', category: 'data', shape: 'low',
    visual: 'A crumbling, flickering storage drive.',
    message: 'Back up important organisational data regularly.',
    detail:
      'A stolen laptop, failed drive or ransomware attack can erase years of work. Follow a simple rule such as 3-2-1 (three copies, two media, one off-site), encrypt backups, and test that you can actually restore them.',
    difficulty: 1, envs: ['maze', 'sheets', 'city'],
  },
  // ---------- CATEGORY B: PRIVACY & SECURITY ----------
  {
    id: 'public_ai_upload', num: 8, name: 'Beneficiary Data in Public AI', category: 'privacy', shape: 'wall',
    visual: 'A giant AI prompt window stuffed with identity documents.',
    message: 'Never share identifiable beneficiary data with AI tools without authorisation and safeguards.',
    detail:
      'Pasting names, phone numbers or addresses into a public AI tool may send personal data to a third party whose storage and training practices you have not assessed. Remove identifiers, use only the minimum data needed, check the tool\'s data-handling terms and your own policy, and get appropriate approval first.',
    difficulty: 3, envs: ['security', 'ai', 'city'],
  },
  {
    id: 'no_privacy_policy', num: 9, name: 'No Data Privacy Policy', category: 'privacy', shape: 'high',
    visual: 'A huge, completely blank policy document hanging overhead.',
    message: 'Establish clear data protection policies.',
    detail:
      'Without a written policy, every staff member decides alone what is acceptable. A short, practical policy should cover what data you collect and why, who can access it, how long you keep it, how it is protected and what to do if something goes wrong.',
    difficulty: 1, envs: ['security', 'city'],
  },
  {
    id: 'no_consent', num: 10, name: 'No Beneficiary Consent', category: 'privacy', shape: 'low',
    visual: 'A consent form with an empty signature line.',
    message: 'Respect beneficiary rights and explain how their information is used.',
    detail:
      'People should understand what information is collected about them, why, and how it will be used. Depending on the law that applies and the purpose, you may need consent or another lawful basis — and you always owe people a clear, understandable notice.',
    difficulty: 2, envs: ['security', 'city'],
  },
  {
    id: 'weak_passwords', num: 11, name: 'Weak Passwords', category: 'privacy', shape: 'wall',
    visual: 'A cracked digital padlock.',
    message: 'Use strong, unique passwords and multi-factor authentication.',
    detail:
      'Short or reused passwords are the easiest way into an organisation. Encourage long passphrases, a password manager, and multi-factor authentication on email, cloud storage and databases.',
    difficulty: 1, envs: ['security', 'city'],
  },
  {
    id: 'shared_logins', num: 12, name: 'Shared Login Credentials', category: 'privacy', shape: 'low',
    visual: 'One oversized key that several figures are trying to hold.',
    message: 'Give each team member an individual account.',
    detail:
      'When everyone shares one login, you cannot tell who changed what, cannot remove one person\'s access when they leave, and one leak exposes everything. Individual accounts make access accountable and revocable.',
    difficulty: 2, envs: ['security', 'city'],
  },
  {
    id: 'unauthorised_access', num: 13, name: 'Unauthorised Data Access', category: 'privacy', shape: 'wall',
    visual: 'A data vault left wide open.',
    message: 'Use role-based access controls.',
    detail:
      'Not everyone needs to see everything. Give people access based on their role and responsibilities, review permissions when roles change, and remove access promptly when people leave.',
    difficulty: 2, envs: ['security', 'city'],
  },
  {
    id: 'no_retention', num: 14, name: 'No Data Retention Policy', category: 'privacy', shape: 'wall',
    visual: 'A towering, never-ending stack of archive boxes.',
    message: 'Keep information only as long as necessary.',
    detail:
      'Keeping personal data forever increases the damage of any breach and may break data-protection rules. Define how long each type of record is needed, then securely archive or delete it.',
    difficulty: 2, envs: ['maze', 'security', 'city'],
  },
  {
    id: 'public_links', num: 15, name: 'Publicly Shared Confidential Files', category: 'privacy', shape: 'high',
    visual: 'An exposed folder floating overhead under a public-link globe.',
    message: 'Review file-sharing permissions before sharing documents.',
    detail:
      '"Anyone with the link" sharing means anyone who receives a forwarded link can open the file. Share with named people, set expiry dates where possible, and periodically review what is shared publicly.',
    difficulty: 1, envs: ['security', 'city'],
  },
  // ---------- CATEGORY C: AI ADOPTION & GOVERNANCE ----------
  {
    id: 'copy_paste_ai', num: 16, name: 'Copy-Paste AI Dependency', category: 'ai', shape: 'low',
    visual: 'A conveyor spitting out identical AI-generated documents.',
    message: 'AI should support your work, not replace your judgement.',
    detail:
      'Pasting AI output straight into proposals or reports without reading it critically produces generic, sometimes wrong, content — and staff stop building their own skills. Use AI for drafts and ideas, then edit, check and own the final result.',
    difficulty: 1, envs: ['ai', 'city'],
  },
  {
    id: 'hallucination', num: 17, name: 'AI Hallucination', category: 'ai', shape: 'wall',
    visual: 'A glitching report screen full of impossible numbers.',
    message: 'Verify AI-generated facts before using them.',
    detail:
      'Generative AI can produce confident, plausible text that is simply false — invented statistics, citations or quotes. Check every fact, figure and reference against a trusted original source before you publish or decide anything.',
    difficulty: 2, envs: ['ai', 'city'],
  },
  {
    id: 'no_ai_guidelines', num: 18, name: 'No AI Usage Guidelines', category: 'ai', shape: 'high',
    visual: 'An AI drone hovering with no instructions attached.',
    message: 'Create clear AI usage guidelines.',
    detail:
      'If staff use AI with no guidance, practices vary wildly and sensitive data may leak. Simple guidelines say which tools are approved, what data must never be entered, when outputs need review and how to disclose AI use.',
    difficulty: 1, envs: ['ai', 'city'],
  },
  {
    id: 'ai_bias', num: 19, name: 'AI Bias', category: 'ai', shape: 'low',
    visual: 'A heavily unbalanced decision scale.',
    message: 'Review AI outputs for bias and unfair treatment.',
    detail:
      'AI systems learn patterns from data that may under-represent or stereotype some groups. Test outputs across different groups, invite feedback from the communities affected, and never let a biased output silently shape who receives support.',
    difficulty: 3, envs: ['ai', 'city'],
  },
  {
    id: 'no_human_review', num: 20, name: 'No Human Verification', category: 'ai', shape: 'high',
    visual: 'An autonomous AI barrier gate swinging at head height.',
    message: 'Keep humans responsible for important decisions.',
    detail:
      'Decisions that affect people\'s access to services, money or protection should be made by an accountable person who can review the evidence, explain the decision and correct mistakes. AI can inform; humans decide.',
    difficulty: 3, envs: ['ai', 'city'],
  },
];

export const RISK_BY_ID: Record<string, RiskDef> = Object.fromEntries(RISKS.map((r) => [r.id, r]));

export const RISK_CATEGORY_LABEL: Record<string, string> = {
  data: 'Data Management',
  privacy: 'Privacy & Security',
  ai: 'AI Governance',
};
