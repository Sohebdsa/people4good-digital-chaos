import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { WORKSHOP_DAYS, type WorkshopOutput, type WorkshopActivity } from '../../data/workshop';
import { RISKS } from '../../data/risks';
import { TOOLS } from '../../data/tools';
import { ASSESSMENT, categoryScore } from '../../data/assessment';
import { ScreenHeader } from '../ScreenHeader';
import { Icon, hex } from '../Icon';
import { click, go, launchRun } from '../../actions';

function ProblemsSheet() {
  const w = useApp((s) => s.workshop);
  const setW = useApp((s) => s.setWorkshop);
  const toggle = (id: string) =>
    setW((x) => ({ ...x, problems: x.problems.includes(id) ? x.problems.filter((p) => p !== id) : [...x.problems, id] }));
  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Which of the game’s risks do you recognise in your organisation? Tick all that apply.</p>
      <div className="problem-grid">
        {RISKS.map((r) => (
          <button key={r.id} className={`problem ${w.problems.includes(r.id) ? 'on' : ''}`} onClick={() => toggle(r.id)} aria-pressed={w.problems.includes(r.id)}>
            <span>{w.problems.includes(r.id) ? '☑' : '☐'}</span>
            <span><b>{r.name}</b>{r.message}</span>
          </button>
        ))}
      </div>
      <label style={{ display: 'grid', gap: 4, marginTop: 10, fontWeight: 600, fontSize: 14 }}>
        Notes — describe the biggest problem in your own words (avoid names or personal details)
        <textarea className="field" value={w.problemNotes} onChange={(e) => setW((x) => ({ ...x, problemNotes: e.target.value }))} />
      </label>
    </>
  );
}

function ToolsSheet() {
  const discovered = useApp((s) => s.profile.discoveredTools);
  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Tools you have discovered in the game ({discovered.length}/{TOOLS.length}). Discuss which could fit your context.</p>
      <div className="row">
        {TOOLS.map((t) => (
          <span key={t.id} className="tag" style={{ opacity: discovered.includes(t.id) ? 1 : 0.35, background: discovered.includes(t.id) ? hex(t.color) : undefined, color: discovered.includes(t.id) ? '#fff' : undefined }}>
            {t.name}
          </span>
        ))}
      </div>
      <button className="btn small" style={{ marginTop: 10 }} onClick={() => { useApp.setState({ returnTo: 'workshop' }); go('learning'); }}>
        <Icon name="book" size={16} color="#14213d" /> Open Digital Tools Discovery
      </button>
    </>
  );
}

function AssessmentSheet({ cats }: { cats: string[] }) {
  const answers = useApp((s) => s.assessment.answers);
  return (
    <>
      {cats.map((id) => {
        const c = ASSESSMENT.find((x) => x.id === id)!;
        const answered = (answers[id] ?? []).filter((v) => v !== null && v !== undefined).length;
        return (
          <div className="cat-bar" key={id}>
            <div className="name">{c.name} <small>· {answered}/{c.questions.length} answered</small></div>
            <div className="pct">{categoryScore(answers, id)}%</div>
            <div className="progress"><i style={{ width: `${categoryScore(answers, id)}%`, background: c.color }} /></div>
          </div>
        );
      })}
      <button className="btn small" onClick={() => { useApp.setState({ returnTo: 'workshop' }); go('assessment'); }}>
        <Icon name="chart" size={16} color="#14213d" /> Open self-assessment
      </button>
    </>
  );
}

function ExperimentSheet() {
  const ex = useApp((s) => s.workshop.experiment);
  const setW = useApp((s) => s.setWorkshop);
  const set = (p: Partial<typeof ex>) => setW((x) => ({ ...x, experiment: { ...x.experiment, ...p } }));
  const field = (k: 'task' | 'tool' | 'data' | 'review' | 'success', label: string, ph: string) => (
    <label style={{ display: 'grid', gap: 4, fontWeight: 600, fontSize: 13 }}>
      {label}
      <input className="field" value={ex[k]} placeholder={ph} onChange={(e) => set({ [k]: e.target.value })} />
    </label>
  );
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {field('task', 'Task to try with AI', 'e.g. Draft the monthly donor update')}
      {field('tool', 'Approved tool', 'e.g. Organisation AI assistant account')}
      {field('data', 'Data you will use', 'e.g. Aggregated programme figures only')}
      <label className="check" style={{ fontSize: 14 }}>
        <input type="checkbox" checked={ex.noPersonalData} onChange={(e) => set({ noPersonalData: e.target.checked })} />
        I confirm no identifiable beneficiary or staff data will be entered.
      </label>
      {field('review', 'Human review step', 'e.g. Programme manager checks facts before sending')}
      {field('success', 'Success looks like…', 'e.g. 2 hours saved, no factual errors')}
    </div>
  );
}

function AutomationSheet() {
  const list = useApp((s) => s.workshop.automation);
  const setW = useApp((s) => s.setWorkshop);
  const upd = (id: string, p: Record<string, string>) => setW((x) => ({ ...x, automation: x.automation.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {list.map((a) => (
        <div key={a.id} className="row" style={{ alignItems: 'flex-end' }}>
          <input className="field" style={{ flex: '2 1 160px' }} placeholder="Repetitive process" value={a.process} onChange={(e) => upd(a.id, { process: e.target.value })} />
          <input className="field" style={{ flex: '0 1 90px' }} placeholder="Hrs/month" value={a.hours} onChange={(e) => upd(a.id, { hours: e.target.value })} />
          <input className="field" style={{ flex: '3 1 200px' }} placeholder="Automation idea + how you'll verify it" value={a.idea} onChange={(e) => upd(a.id, { idea: e.target.value })} />
          <button className="icon-btn" style={{ width: 40, height: 40 }} aria-label="Remove" onClick={() => setW((x) => ({ ...x, automation: x.automation.filter((y) => y.id !== a.id) }))}>
            <Icon name="trash" size={16} color="#e63946" />
          </button>
        </div>
      ))}
      <button className="btn small" style={{ justifySelf: 'start' }} onClick={() => setW((x) => ({ ...x, automation: [...x.automation, { id: `a${Date.now()}`, process: '', hours: '', idea: '' }] }))}>
        <Icon name="plus" size={16} color="#14213d" /> Add opportunity
      </button>
    </div>
  );
}

function PrioritiesSheet() {
  const answers = useApp((s) => s.assessment.answers);
  const focus = useApp((s) => s.assessment.focus);
  const ranked = [...ASSESSMENT].sort((a, b) => categoryScore(answers, a.id) - categoryScore(answers, b.id));
  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Lowest-scoring areas first. Starred areas are your chosen priorities.</p>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
        {ranked.map((c) => (
          <li key={c.id}>{focus.includes(c.id) ? '★ ' : ''}<b>{c.name}</b> — {categoryScore(answers, c.id)}% · <span className="muted">{c.nextSteps[0]}</span></li>
        ))}
      </ol>
    </>
  );
}


function OutputCard({ o }: { o: WorkshopOutput }) {
  const done = useApp((s) => !!s.workshop.done[o.id]);
  const setW = useApp((s) => s.setWorkshop);
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row">
        <label className="check" style={{ padding: 0 }}>
          <input type="checkbox" checked={done} onChange={(e) => setW((x) => ({ ...x, done: { ...x.done, [o.id]: e.target.checked } }))} />
          <b style={{ fontFamily: 'var(--display)', fontSize: 17 }}>{o.label}</b>
        </label>
        <div className="spacer" />
        <button className="btn small" onClick={() => { click(); setOpen(!open); }}>{open ? 'Close' : 'Open worksheet'}</button>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          {o.kind === 'problems' && <ProblemsSheet />}
          {o.kind === 'tools' && <ToolsSheet />}
          {o.kind === 'assessment' && <AssessmentSheet cats={o.assessmentCategories ?? []} />}
          {o.kind === 'experiment' && <ExperimentSheet />}
          {o.kind === 'automation' && <AutomationSheet />}
          {o.kind === 'priorities' && <PrioritiesSheet />}
        </div>
      )}
    </div>
  );
}

export function Workshop() {
  const [day, setDay] = useState(0);
  const done = useApp((s) => s.workshop.done);
  const unlocked = useApp((s) => s.profile.unlockedEnvs);
  const d = WORKSHOP_DAYS[day];

  const runActivity = (a: WorkshopActivity) => {
    if (a.kind === 'run' && a.env) {
      launchRun({ env: a.env, gates: a.gates, workshopDay: d.day });
    } else if (a.screen) {
      useApp.setState({ returnTo: 'workshop' });
      go(a.screen);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader title="Workshop Mode: PEOPLE4GOOD AI Lab" sub="A three-day capacity-building journey linking play to practical planning." back="menu" />
      <div className="screen-body ui-scroll">
        <div className="tabs">
          {WORKSHOP_DAYS.map((x, i) => {
            const outs = x.outputs.filter((o) => done[o.id]).length;
            return (
              <button key={x.day} className={`tab ${day === i ? 'active' : ''}`} onClick={() => { click(); setDay(i); }}>
                Day {x.day} · {x.title} <span style={{ opacity: 0.7 }}>({outs}/{x.outputs.length})</span>
              </button>
            );
          })}
        </div>
        <div className="grid two">
          <div className="card day-card" style={{ ['--c' as string]: d.color }}>
            <span className="tag">Day {d.day}</span>
            <h3 style={{ fontSize: 26, marginTop: 8 }}>{d.title}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{d.subtitle}</p>
            <b>Objectives</b>
            <ul style={{ margin: '6px 0 12px', paddingLeft: 20, lineHeight: 1.7 }}>{d.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            <b>Discussion prompts</b>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>{d.discussion.map((o) => <li key={o}>{o}</li>)}</ul>
          </div>
          <div className="card">
            <h3>Game activities</h3>
            <div className="item-list" style={{ marginTop: 8 }}>
              {d.activities.map((a) => {
                const locked = a.kind === 'run' && a.env && !unlocked.includes(a.env);
                return (
                  <div className="item" key={a.label}>
                    <div className="ic" style={{ background: a.kind === 'run' ? d.color : 'var(--ink)' }}>
                      <Icon name={a.kind === 'run' ? 'play' : a.screen === 'learning' ? 'book' : a.screen === 'missions' ? 'target' : 'chart'} color="#fff" />
                    </div>
                    <div>
                      <h4>{a.label}</h4>
                      <p>{a.description}{locked ? ' (Workshop Mode unlocks this start point.)' : ''}</p>
                    </div>
                    <button className="btn small primary" onClick={() => runActivity(a)}>{a.kind === 'run' ? 'Play' : 'Open'}</button>
                  </div>
                );
              })}
            </div>
            <div className="note" style={{ marginTop: 12 }}>
              Workshop runs prioritise the Decision Gates for the day’s themes. The game reinforces facilitated learning — it does not replace
              discussion, facilitation or a proper organisational assessment.
            </div>
          </div>
        </div>
        <h3 style={{ color: '#fff', margin: '20px 0 10px', fontSize: 22 }}>Workshop outputs</h3>
        <div className="grid" style={{ gap: 12 }}>
          {d.outputs.map((o) => <OutputCard key={o.id} o={o} />)}
        </div>
      </div>
    </div>
  );
}

