import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { PHASES, ROADMAP_NOTE, blankItem, generateRoadmap, type RoadmapItem, type Phase } from '../../data/roadmap';
import { ASSESSMENT, categoryScore, isComplete } from '../../data/assessment';
import { ScreenHeader } from '../ScreenHeader';
import { Icon } from '../Icon';
import { click, go } from '../../actions';
import { setFlagAndCheck } from '../../systems/progression';

const CAT_NAME: Record<string, string> = { ...Object.fromEntries(ASSESSMENT.map((c) => [c.id, c.name])), custom: 'Custom' };

function ItemEditor({ item, onChange, onRemove }: { item: RoadmapItem; onChange: (p: Partial<RoadmapItem>) => void; onRemove: () => void }) {
  return (
    <div className="rm-item">
      <label className="wide">
        Action
        <input className="field" value={item.action} placeholder="Describe the action" onChange={(e) => onChange({ action: e.target.value })} />
      </label>
      <label className="mid">
        Area
        <select className="field" value={item.category} onChange={(e) => onChange({ category: e.target.value })}>
          {Object.entries(CAT_NAME).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
      </label>
      <label>
        Priority
        <select className={`field prio-${item.priority}`} value={item.priority} onChange={(e) => onChange({ priority: e.target.value as RoadmapItem['priority'] })}>
          {['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label>
        Responsible (role)
        <input className="field" value={item.owner} placeholder="e.g. M&E Officer" onChange={(e) => onChange({ owner: e.target.value })} />
      </label>
      <label>
        Timeline
        <input className="field" value={item.timeline} onChange={(e) => onChange({ timeline: e.target.value })} />
      </label>
      <label>
        Status
        <select className="field" value={item.status} onChange={(e) => onChange({ status: e.target.value as RoadmapItem['status'] })}>
          {['Not started', 'In progress', 'Done', 'Blocked'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="third">
        Required resources
        <input className="field" value={item.resources} onChange={(e) => onChange({ resources: e.target.value })} />
      </label>
      <label className="wide">
        Success metric
        <input className="field" value={item.metric} onChange={(e) => onChange({ metric: e.target.value })} />
      </label>
      <div className="rm-actions">
        <button className="btn small" onClick={onRemove} aria-label="Remove action"><Icon name="trash" size={16} color="#e63946" /> Remove</button>
      </div>
    </div>
  );
}

export function Roadmap() {
  const roadmap = useApp((s) => s.roadmap);
  const setRoadmap = useApp((s) => s.setRoadmap);
  const assessment = useApp((s) => s.assessment);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const complete = isComplete(assessment.answers);

  const update = (id: string, p: Partial<RoadmapItem>) =>
    setRoadmap({ items: roadmap.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const remove = (id: string) => setRoadmap({ items: roadmap.items.filter((i) => i.id !== id) });
  const add = (phase: Phase) => {
    click();
    setRoadmap({ items: [...roadmap.items, blankItem(phase)], createdAt: roadmap.createdAt ?? new Date().toISOString() });
    const unlocked = setFlagAndCheck('flag:roadmap');
    if (unlocked.length) setNotice(`Achievement unlocked: ${unlocked.join(', ')}`);
  };
  const regenerate = () => {
    click();
    const scores = Object.fromEntries(ASSESSMENT.map((c) => [c.id, categoryScore(assessment.answers, c.id)]));
    setRoadmap({ items: generateRoadmap(scores, assessment.focus), createdAt: new Date().toISOString() });
    const unlocked = setFlagAndCheck('flag:roadmap');
    if (unlocked.length) setNotice(`Achievement unlocked: ${unlocked.join(', ')}`);
    setConfirmRegen(false);
  };
  const exportPdf = async () => {
    click();
    setExporting(true);
    setError(null);
    try {
      const { exportRoadmapPdf } = await import('../../systems/exportPdf');
      await exportRoadmapPdf();
    } catch (e) {
      console.warn(e);
      setError('Sorry — the PDF could not be created in this browser.');
    } finally {
      setExporting(false);
    }
  };

  const done = roadmap.items.filter((i) => i.status === 'Done').length;

  return (
    <div className="screen">
      <ScreenHeader
        title="90-Day Digital Transformation Roadmap"
        sub={roadmap.items.length ? `${roadmap.items.length} actions · ${done} done` : 'Your practical plan to take back to your organisation.'}
        right={
          <button className="btn primary small" disabled={exporting} onClick={exportPdf}>
            <Icon name="download" size={18} color="#14213d" /> {exporting ? 'Preparing…' : 'Export PDF'}
          </button>
        }
      />
      <div className="screen-body ui-scroll">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row">
            <label style={{ flex: '1 1 260px', display: 'grid', gap: 4, fontWeight: 600, fontSize: 14 }}>
              Organisation name (optional — appears on the PDF)
              <input className="field" value={roadmap.orgName} maxLength={80} placeholder="e.g. Community Health Alliance" onChange={(e) => setRoadmap({ orgName: e.target.value })} />
            </label>
            <div className="spacer" />
            {complete ? (
              confirmRegen ? (
                <div className="row">
                  <span style={{ fontSize: 14 }}><b>Replace all current actions?</b></span>
                  <button className="btn coral small" onClick={regenerate}>Yes, regenerate</button>
                  <button className="btn small" onClick={() => setConfirmRegen(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn teal" onClick={() => (roadmap.items.length ? setConfirmRegen(true) : regenerate())}>
                  <Icon name="spark" size={18} color="#fff" /> {roadmap.items.length ? 'Regenerate from assessment' : 'Generate from my assessment'}
                </button>
              )
            ) : (
              <button className="btn teal" onClick={() => { useApp.setState({ returnTo: 'roadmap' }); go('assessment'); }}>
                <Icon name="chart" size={18} color="#fff" /> Take the assessment first
              </button>
            )}
          </div>
          <div className="note" style={{ marginTop: 12 }}>{ROADMAP_NOTE}</div>
          {notice && <div className="note" style={{ marginTop: 8, background: '#f3eaff' }}>{notice}</div>}
          {error && <div className="note" style={{ marginTop: 8, color: 'var(--red)' }}>{error}</div>}
        </div>

        {PHASES.map((ph) => {
          const items = roadmap.items.filter((i) => i.phase === ph.id);
          return (
            <div className="rm-phase" key={ph.id}>
              <div className="rm-phase-head">
                <h3>{ph.name}</h3>
                <span style={{ opacity: 0.75 }}>{ph.timeline} · {ph.blurb}</span>
                <div className="spacer" />
                <button className="btn small" onClick={() => add(ph.id)}><Icon name="plus" size={16} color="#14213d" /> Add action</button>
              </div>
              {items.length === 0 && <div className="note" style={{ background: 'rgba(255,255,255,0.9)' }}>No actions yet in this phase.</div>}
              {items.map((it) => (
                <ItemEditor key={it.id} item={it} onChange={(p) => update(it.id, p)} onRemove={() => { click(); remove(it.id); }} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
