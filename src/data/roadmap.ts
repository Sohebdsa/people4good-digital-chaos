export type Phase = 'immediate' | 'd30' | 'd60' | 'd90';
export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'Not started' | 'In progress' | 'Done' | 'Blocked';

export interface RoadmapItem {
  id: string;
  phase: Phase;
  category: string;
  action: string;
  priority: Priority;
  owner: string;
  timeline: string;
  resources: string;
  metric: string;
  status: Status;
}

export const PHASES: { id: Phase; name: string; timeline: string; blurb: string }[] = [
  { id: 'immediate', name: 'Immediate Actions', timeline: 'Week 1–2', blurb: 'Quick wins you can start this week.' },
  { id: 'd30', name: '30-Day Plan', timeline: 'By day 30', blurb: 'Test, standardise and train.' },
  { id: 'd60', name: '60-Day Plan', timeline: 'By day 60', blurb: 'Implement and connect.' },
  { id: 'd90', name: '90-Day Plan', timeline: 'By day 90', blurb: 'Evaluate, govern and plan long-term.' },
];

type Template = Omit<RoadmapItem, 'id' | 'priority' | 'owner' | 'status' | 'timeline'>;

/** Suggested action library, keyed by assessment category. */
export const ACTION_LIBRARY: Template[] = [
  // infrastructure
  { phase: 'immediate', category: 'infrastructure', action: 'List all devices, accounts and software in use', resources: 'Spreadsheet template, 2–3 hours', metric: 'Inventory completed and shared with leadership' },
  { phase: 'd30', category: 'infrastructure', action: 'Move key staff to organisation-managed email and storage accounts', resources: 'Nonprofit cloud offers, IT volunteer', metric: '100% of staff on organisational accounts' },
  { phase: 'd60', category: 'infrastructure', action: 'Agree an IT support arrangement (staff focal point or partner)', resources: 'Budget line or skilled volunteer', metric: 'Support contact known by all staff' },
  { phase: 'd90', category: 'infrastructure', action: 'Plan device replacement and connectivity improvements in the budget', resources: 'Finance team input', metric: 'Infrastructure needs costed in next budget' },
  // data
  { phase: 'immediate', category: 'data', action: 'Organise existing digital files into an agreed folder structure', resources: 'Shared drive, 1 day', metric: 'Folder structure agreed and used by all teams' },
  { phase: 'd30', category: 'data', action: 'Standardise beneficiary record fields and introduce unique IDs', resources: 'Data focal point, field team input', metric: 'Standard form in use for new registrations' },
  { phase: 'd30', category: 'data', action: 'Test digital data collection with one field team (offline-capable)', resources: 'Data collection tool, 2–3 devices', metric: 'Pilot completed with feedback documented' },
  { phase: 'd60', category: 'data', action: 'Implement a centralised information system for core records', resources: 'Selected database/CMS, migration time', metric: 'Core records held in one system' },
  { phase: 'd60', category: 'data', action: 'Introduce monthly data quality checks and duplicate reconciliation', resources: 'Checklist, 2 hours/month', metric: 'Duplicate and error rate tracked monthly' },
  { phase: 'd90', category: 'data', action: 'Set up and test regular encrypted backups', resources: 'Backup tool or cloud service', metric: 'Successful restore test documented' },
  // ai
  { phase: 'immediate', category: 'ai', action: 'Establish basic AI usage guidelines (approved tools, forbidden data)', resources: 'One-page template, leadership sign-off', metric: 'Guidelines shared with all staff' },
  { phase: 'd30', category: 'ai', action: 'Train staff on approved AI tools and responsible use', resources: '2-hour session, examples', metric: '80% of staff trained' },
  { phase: 'd60', category: 'ai', action: 'Run two AI pilots on low-risk tasks with human review', resources: 'Approved AI tool, pilot owners', metric: 'Time saved and quality issues recorded' },
  { phase: 'd90', category: 'ai', action: 'Review AI governance: what worked, risks found, policy updates', resources: 'Pilot reports, leadership meeting', metric: 'Updated AI policy approved' },
  // privacy
  { phase: 'immediate', category: 'privacy', action: 'Review access permissions and public file-sharing links', resources: 'Admin console, 2–4 hours', metric: 'No unnecessary public links; access matches roles' },
  { phase: 'immediate', category: 'privacy', action: 'Enable multi-factor authentication on email and cloud storage', resources: 'Admin settings, authenticator app', metric: 'MFA enabled for all accounts' },
  { phase: 'd30', category: 'privacy', action: 'Draft or update the data privacy policy and beneficiary notice', resources: 'Template, legal/pro-bono review if available', metric: 'Policy approved; notice used at registration' },
  { phase: 'd60', category: 'privacy', action: 'Define a data retention schedule for key record types', resources: 'Programme and finance input', metric: 'Retention periods documented' },
  { phase: 'd90', category: 'privacy', action: 'Run a privacy and security refresher with an incident-response plan', resources: '1-hour session, contact list', metric: 'Incident plan known by staff' },
  // automation
  { phase: 'immediate', category: 'automation', action: 'Identify the top five repetitive manual processes', resources: 'Team discussion, 1 hour', metric: 'List of five processes with time estimates' },
  { phase: 'd30', category: 'automation', action: 'Introduce secure shared storage and collaborative documents', resources: 'Cloud workspace', metric: 'Teams co-edit instead of emailing files' },
  { phase: 'd60', category: 'automation', action: 'Automate one selected workflow and verify its output', resources: 'Automation platform, owner', metric: 'Hours saved per month measured' },
  { phase: 'd90', category: 'automation', action: 'Improve reporting and analytics with a connected dashboard', resources: 'Dashboard tool, clean data source', metric: 'Monthly report generated from source data' },
  // strategy
  { phase: 'immediate', category: 'strategy', action: 'Agree three digital priorities with leadership', resources: 'Assessment results, 1 meeting', metric: 'Priorities documented and owned' },
  { phase: 'd30', category: 'strategy', action: 'Assign owners and resources to each roadmap action', resources: 'Leadership time', metric: 'Every action has an owner' },
  { phase: 'd60', category: 'strategy', action: 'Establish a regular reporting process on roadmap progress', resources: 'Monthly 30-min check-in', metric: 'Progress reviewed monthly' },
  { phase: 'd90', category: 'strategy', action: 'Evaluate implemented tools and document a long-term digital strategy', resources: 'Evaluation notes, staff survey', metric: '12-month digital strategy drafted' },
];

const PHASE_TIMELINE: Record<Phase, string> = { immediate: 'Week 1–2', d30: 'Days 1–30', d60: 'Days 31–60', d90: 'Days 61–90' };

let counter = 0;
export function newId() {
  counter += 1;
  return `rm_${Date.now().toString(36)}_${counter}`;
}

/**
 * Build suggested roadmap: categories sorted by score (weakest first).
 * Weak categories (< 50) get all of their actions; medium get first two; strong get one.
 */
export function generateRoadmap(scores: Record<string, number>, focus: string[]): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  const cats = Object.keys(scores).sort((a, b) => scores[a] - scores[b]);
  for (const cat of cats) {
    const s = scores[cat];
    const lib = ACTION_LIBRARY.filter((a) => a.category === cat);
    const isFocus = focus.includes(cat);
    const take = isFocus || s < 50 ? lib.length : s < 75 ? 2 : 1;
    lib.slice(0, take).forEach((t) => {
      items.push({
        ...t,
        id: newId(),
        priority: isFocus || s < 40 ? 'High' : s < 70 ? 'Medium' : 'Low',
        owner: '',
        timeline: PHASE_TIMELINE[t.phase],
        status: 'Not started',
      });
    });
  }
  const order: Phase[] = ['immediate', 'd30', 'd60', 'd90'];
  const prio: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  return items.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase) || prio[a.priority] - prio[b.priority]);
}

export function blankItem(phase: Phase): RoadmapItem {
  return {
    id: newId(), phase, category: 'custom', action: '', priority: 'Medium', owner: '', timeline: PHASE_TIMELINE[phase],
    resources: '', metric: '', status: 'Not started',
  };
}

export const ROADMAP_NOTE =
  'These are suggested actions based on your self-assessment — not automatic recommendations for every NGO. Edit, remove and add actions to fit your context. Tip: enter roles (e.g. "Programme Manager") rather than personal names.';
