export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string[];
  tryThis?: string;
}

export interface LearningSection {
  id: string;
  letter: string;
  title: string;
  color: string;
  articles: Article[];
}

export const LEARNING: LearningSection[] = [
  {
    id: 'fundamentals', letter: 'A', title: 'Digital Transformation Fundamentals', color: '#ffb627',
    articles: [
      {
        id: 'what-is-dt', title: 'What is digital transformation?',
        summary: 'Changing how the organisation works — not just buying technology.',
        body: [
          'Digital transformation is the ongoing process of improving how an organisation delivers its mission by rethinking processes, skills, culture and data — with technology as an enabler.',
          'For an NGO that might mean field teams collecting data once instead of three times, managers seeing programme progress weekly instead of quarterly, or beneficiaries getting faster, fairer responses.',
          'It is a journey of small, deliberate steps. Success is measured in outcomes — time saved, data quality, safer information, better decisions — not in the number of apps installed.',
        ],
        tryThis: 'Name one process in your organisation that frustrates staff every week. That is a transformation candidate.',
      },
      {
        id: 'why-ngos', title: 'Why do NGOs need digital systems?',
        summary: 'Accountability, efficiency, protection and impact.',
        body: [
          'Donors and communities expect accurate, timely reporting. Digital systems make it possible to show what was done, for whom and with what result.',
          'Good systems reduce repetitive administration so scarce staff time goes to programmes.',
          'They also protect people: well-managed data is easier to secure, correct and delete than paper scattered across offices.',
        ],
      },
      {
        id: 'digitising-vs-dt', title: 'Digitising vs digital transformation',
        summary: 'Scanning a bad form gives you a bad digital form.',
        body: [
          'Digitisation converts something into digital form — scanning paper, typing registers into Excel.',
          'Digitalisation uses digital tools to improve a process — a mobile form with validation that feeds a database.',
          'Transformation rethinks the work itself — for example, using live data to decide where to send outreach teams next week.',
          'All three are useful. The trap is assuming the first one is the last one.',
        ],
      },
      {
        id: 'inefficiencies', title: 'Identifying operational inefficiencies',
        summary: 'Look for repetition, re-typing, waiting and searching.',
        body: [
          'Map a process step by step: who does what, with which tool, and how long it takes.',
          'Red flags: the same data typed more than once, files emailed back and forth, reports assembled by hand, information that only one person can find.',
          'Prioritise problems that are frequent, painful and fixable with modest effort.',
        ],
        tryThis: 'Time one monthly report end to end. How many steps are copy-and-paste?',
      },
      {
        id: 'choosing-tech', title: 'Choosing appropriate technology',
        summary: 'Start from the problem, people and context — not the tool.',
        body: [
          'Define the problem and the users first. Then consider budget (including long-term costs), skills, connectivity, data protection, local language support, and who will maintain it.',
          'Prefer tools that integrate with what you already use, can export your data, and have a sustainable cost model (many offer nonprofit pricing).',
          'Pilot with a small group, gather feedback, then scale.',
        ],
      },
    ],
  },
  {
    id: 'data', letter: 'B', title: 'Data Management', color: '#2bb3a3',
    articles: [
      {
        id: 'structured-collection', title: 'Structured data collection',
        summary: 'Collect it right the first time — on paper or digitally.',
        body: [
          'Structured collection means consistent questions, formats and codes so data can be combined and analysed.',
          'Digital forms (e.g. KoboToolbox or ODK) add validation, skip logic, GPS and photos, and many work offline then sync securely.',
          'Paper remains valid where devices or connectivity are not realistic. Pair it with a clear process to digitise, check and store it.',
        ],
      },
      {
        id: 'data-quality', title: 'Data quality',
        summary: 'Accurate, complete, consistent and timely.',
        body: [
          'Bad data leads to bad decisions. Build checks into collection (validation rules, required fields) and into routine (monthly spot checks).',
          'Share data back with field teams — people care more about data they see being used.',
        ],
      },
      {
        id: 'unique-ids', title: 'Unique identifiers',
        summary: 'One person, one record.',
        body: [
          'A unique ID assigned at registration links services, visits and outcomes to the right person and prevents duplicates.',
          'Avoid using sensitive numbers (like national ID) as your ID unless necessary and lawful; a generated code is usually safer.',
          'Always search before creating a new record, and reconcile duplicates regularly.',
        ],
      },
      {
        id: 'central-db', title: 'Centralised databases',
        summary: 'Enter once, use many times.',
        body: [
          'A central database (or case-management system) holds the master version of key information with defined fields and permissions.',
          'It can start small — a well-structured shared database is better than twenty unconnected spreadsheets.',
        ],
      },
      {
        id: 'visualisation', title: 'Data visualisation',
        summary: 'Turn numbers into decisions.',
        body: [
          'Dashboards (e.g. Power BI, Looker Studio) make trends and gaps visible to staff, boards and donors.',
          'Show only what supports decisions, and make sure the underlying data is trusted.',
        ],
      },
      {
        id: 'reporting', title: 'Reporting',
        summary: 'Standard indicators, connected to the source.',
        body: [
          'Agree a standard set of indicators and definitions. Connect reports to the database rather than re-typing numbers.',
          'Automate assembly where appropriate, and keep a human check before submission.',
        ],
      },
      {
        id: 'backups', title: 'Backups',
        summary: 'Three copies, two media, one off-site — and test restores.',
        body: [
          'Regular automated backups protect against theft, hardware failure, mistakes and ransomware.',
          'Encrypt backups that contain personal data. A backup you have never restored is a hope, not a plan.',
        ],
      },
      {
        id: 'data-governance', title: 'Data governance',
        summary: 'Who owns, accesses and decides about data.',
        body: [
          'Governance defines roles (who owns each dataset), rules (quality, access, retention) and accountability.',
          'Even a one-page data governance note helps a small NGO make consistent decisions.',
        ],
      },
    ],
  },
  {
    id: 'ai', letter: 'C', title: 'AI Fundamentals', color: '#9b5de5',
    articles: [
      {
        id: 'what-is-ai', title: 'What is AI?',
        summary: 'Systems that perform tasks that normally need human judgement.',
        body: [
          'Artificial intelligence covers many techniques — from spam filters and translation to image recognition — that learn patterns from data.',
          'AI is a tool: powerful at some tasks, unreliable at others, and only as good as the data and oversight around it.',
        ],
      },
      {
        id: 'generative-ai', title: 'What is generative AI?',
        summary: 'AI that creates text, images or audio.',
        body: [
          'Generative AI produces new content in response to a prompt. Assistants such as ChatGPT or Gemini generate text; design tools generate images and layouts.',
          'It is excellent for first drafts, summaries and brainstorming, and weak at guaranteeing facts.',
        ],
      },
      {
        id: 'llms', title: 'How LLMs work (high level)',
        summary: 'Very large pattern predictors trained on text.',
        body: [
          'Large language models are trained on huge amounts of text to predict likely next words. That makes them fluent — but fluency is not the same as truth.',
          'They do not "know" your organisation unless you provide context, and anything you type may be processed by the provider according to its terms.',
        ],
      },
      {
        id: 'prompting', title: 'Prompt engineering basics',
        summary: 'Role, task, context, format, constraints.',
        body: [
          'Good prompts state who the AI should act as, the task, relevant (non-sensitive) context, the desired format and any constraints.',
          'Iterate: ask for alternatives, ask it to critique its own draft, and ask for sources you can check.',
        ],
        tryThis: '"Act as a programme officer. Draft a 150-word update for donors on our literacy programme using these anonymised figures… Use plain English."',
      },
      {
        id: 'ai-research', title: 'AI-assisted research',
        summary: 'Ground answers in your own sources.',
        body: [
          'Source-grounded tools such as NotebookLM answer questions using documents you upload, with references you can check.',
          'Only upload documents you are allowed to share with that tool, and still verify key claims.',
        ],
      },
      {
        id: 'ai-writing', title: 'AI-assisted writing',
        summary: 'Draft faster, edit thoughtfully.',
        body: [
          'Use AI for outlines, first drafts, tone adjustments and translation drafts. Then edit for accuracy, voice and context.',
          'Be transparent about AI use where your policy or funders require it.',
        ],
      },
      {
        id: 'ai-analysis', title: 'AI-powered analysis',
        summary: 'Find patterns — on safe, minimised data.',
        body: [
          'AI can categorise open-ended survey answers, summarise feedback or suggest trends.',
          'Remove identifying information first, check results on a sample by hand, and be careful with small groups that could be re-identified.',
        ],
      },
      {
        id: 'ai-automation', title: 'AI and automation',
        summary: 'Automate the repetitive; keep checks on the important.',
        body: [
          'Automation platforms (e.g. Make, Zapier) connect apps so routine steps run by themselves: form submitted → record created → notification sent.',
          'Adding AI steps (summarising, classifying) can help, but test thoroughly and keep a human review for anything that affects people.',
        ],
      },
    ],
  },
  {
    id: 'responsible', letter: 'D', title: 'Responsible AI', color: '#e76f51',
    articles: [
      {
        id: 'hallucinations', title: 'AI hallucinations',
        summary: 'Confident, plausible — and false.',
        body: [
          'Generative AI can invent statistics, quotes, citations and laws. It does not flag when it is guessing.',
          'Verify every fact, number and reference against the original source before you use it.',
        ],
      },
      {
        id: 'bias', title: 'AI bias',
        summary: 'Patterns in data can become unfairness at scale.',
        body: [
          'If training data under-represents or stereotypes certain groups, outputs may too — in language, images or recommendations.',
          'Test outputs across different groups, involve affected communities and never let AI silently decide who gets support.',
        ],
      },
      {
        id: 'human-oversight', title: 'Human oversight',
        summary: 'AI informs; accountable people decide.',
        body: [
          'For decisions that affect people\'s rights, safety or access to services, a trained person must review the evidence and remain accountable.',
          'Oversight needs time, authority and the ability to override the system — not just a rubber stamp.',
        ],
      },
      {
        id: 'data-minimisation', title: 'Data minimisation',
        summary: 'Use the least personal data that does the job.',
        body: [
          'Before using any tool — especially AI — ask: what is the minimum information needed? Remove names, contact details and other identifiers wherever possible.',
          'Aggregated or anonymised data is usually enough for analysis. Be aware that small groups can still be re-identified.',
        ],
      },
      {
        id: 'privacy', title: 'Privacy considerations',
        summary: 'Know where data goes and on what terms.',
        body: [
          'Check how a tool stores, shares and uses what you enter (for example, whether inputs may be used for training), where data is hosted, and whether an organisational agreement exists.',
          'Data-protection laws differ by country; your obligations depend on where you operate and whose data you hold. Seek qualified advice for specific cases.',
        ],
      },
      {
        id: 'consent', title: 'Consent and notice',
        summary: 'People have a right to understand and choose.',
        body: [
          'Tell people clearly what you collect, why, who sees it and how long you keep it. Depending on the law and purpose, you may need consent or another lawful basis.',
          'Consent should be informed and freely given — difficult when people depend on your services, so take extra care and offer alternatives.',
        ],
      },
      {
        id: 'ai-policies', title: 'AI usage policies',
        summary: 'Approved tools, forbidden data, review rules.',
        body: [
          'A practical AI policy covers: approved tools and accounts, data that must never be entered, when human review is required, disclosure, training, and who to contact with questions.',
          'Keep it short, revisit it every six months, and train staff on it.',
        ],
      },
      {
        id: 'transparency', title: 'Transparency',
        summary: 'Be open about when and how AI is used.',
        body: [
          'Let colleagues, donors and communities know when AI materially contributed to content or decisions, in line with your policy.',
          'Transparency builds trust and makes it easier to spot problems.',
        ],
      },
      {
        id: 'accountability', title: 'Accountability',
        summary: 'Someone owns every system and every outcome.',
        body: [
          'Name an owner for each AI use case who monitors performance, handles complaints and can pause the system.',
          'Keep simple records: purpose, data used, risks considered, reviews done.',
        ],
      },
    ],
  },
];

export interface ToolCard {
  name: string;
  category: string;
  useCase: string;
  consider: string;
}

export const TOOL_CARDS: ToolCard[] = [
  { name: 'KoboToolbox', category: 'Data collection', useCase: 'Mobile surveys and registrations with offline support, built for humanitarian contexts.', consider: 'Hosting location, form design skills, device availability.' },
  { name: 'ODK', category: 'Data collection', useCase: 'Open-source, offline-first mobile data collection with flexible form logic.', consider: 'Self-hosting vs hosted service, technical support capacity.' },
  { name: 'Google Drive', category: 'Data storage', useCase: 'Shared cloud folders and documents with collaboration and permissions.', consider: 'Sharing settings, account management, where personal data is stored.' },
  { name: 'Cloud storage systems', category: 'Data storage', useCase: 'Centrally managed file storage with versioning and backup.', consider: 'Cost, data location, access controls, offline needs.' },
  { name: 'PostgreSQL', category: 'Databases', useCase: 'Robust open-source relational database for structured organisational data.', consider: 'Needs technical skills to set up, secure and maintain.' },
  { name: 'MySQL', category: 'Databases', useCase: 'Widely used relational database behind many web applications.', consider: 'Hosting, backups and security updates require ownership.' },
  { name: 'Power BI', category: 'Analytics', useCase: 'Interactive dashboards and reports connected to many data sources.', consider: 'Licensing, data-model skills, sharing permissions.' },
  { name: 'Looker Studio', category: 'Analytics', useCase: 'Free browser-based dashboards, especially with Google data sources.', consider: 'Data connectors, who can view shared reports.' },
  { name: 'ChatGPT', category: 'AI assistants', useCase: 'General-purpose drafting, summarising, brainstorming and analysis help.', consider: 'Account type and data settings, policy on personal data, verifying output.' },
  { name: 'Gemini', category: 'AI assistants', useCase: 'General-purpose AI assistant integrated with Google products.', consider: 'Workspace vs personal accounts, data settings, verification.' },
  { name: 'NotebookLM', category: 'Research', useCase: 'Ask questions of your own uploaded documents with source citations.', consider: 'Which documents you may upload; still check key claims.' },
  { name: 'Canva AI', category: 'Design', useCase: 'Fast design of posters, social media posts and reports with AI features.', consider: 'Image consent, brand accuracy, licensing of generated content.' },
  { name: 'Make', category: 'Automation', useCase: 'Visual workflows connecting apps to automate multi-step processes.', consider: 'Operation limits/cost, error handling, data passing between services.' },
  { name: 'Zapier', category: 'Automation', useCase: 'Simple trigger-action automations between thousands of apps.', consider: 'Task-based pricing, monitoring failures, data flows to third parties.' },
];

export const TOOL_DISCLAIMER =
  'These are examples, not endorsements. No tool is right for every NGO: choose based on your requirements, budget, technical capacity, privacy and security needs, connectivity, and who will maintain it.';

export const ALL_ARTICLES: Article[] = LEARNING.flatMap((s) => s.articles);
export const ARTICLE_BY_ID: Record<string, Article> = Object.fromEntries(ALL_ARTICLES.map((a) => [a.id, a]));
