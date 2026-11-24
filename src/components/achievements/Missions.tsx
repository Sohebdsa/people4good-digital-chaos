import { useApp } from '../../store/appStore';
import { MISSIONS, reqProgress } from '../../data/progression';
import { ScreenHeader } from '../ScreenHeader';
import { Icon } from '../Icon';
import { click, launchRun } from '../../actions';

const DIFF_COLOR = { Easy: '#2b9348', Medium: '#e0a400', Hard: '#e63946' };

export function Missions() {
  const profile = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const counters = profile.counters ?? {};
  const focus = profile.focusMission ?? MISSIONS.find((m) => !profile.missionsDone.includes(m.id))?.id;
  return (
    <div className="screen">
      <ScreenHeader
        title="Missions"
        sub={`${profile.missionsDone.length}/${MISSIONS.length} complete · ${profile.impact.toLocaleString()} Impact Points earned`}
        right={<button className="btn primary small" onClick={() => launchRun({ env: 'maze' })}><Icon name="play" size={18} color="#14213d" /> Play</button>}
      />
      <div className="screen-body ui-scroll">
        <div className="grid two">
          {MISSIONS.map((m) => {
            const done = profile.missionsDone.includes(m.id);
            const prog = done ? 1 : m.scope === 'run' ? 0 : reqProgress(m.reqs, counters);
            const isFocus = focus === m.id && !done;
            return (
              <div className="card" key={m.id} style={{ borderColor: isFocus ? 'var(--sun-dark)' : undefined, opacity: done ? 0.92 : 1 }}>
                <div className="row">
                  <span className="tag">Mission {m.num}</span>
                  <span className="tag" style={{ background: DIFF_COLOR[m.difficulty], color: '#fff' }}>{m.difficulty}</span>
                  {m.scope === 'run' && <span className="tag">Single run</span>}
                  <div className="spacer" />
                  {done ? (
                    <span className="tag" style={{ background: 'var(--sun)' }}><Icon name="check" size={14} color="#14213d" /> Complete</span>
                  ) : isFocus ? (
                    <span className="tag" style={{ background: 'var(--cream)' }}>Tracking in HUD</span>
                  ) : (
                    <button className="btn small" onClick={() => { click(); update((p) => ({ ...p, focusMission: m.id })); }}>Track</button>
                  )}
                </div>
                <h3 style={{ marginTop: 8, fontSize: 22 }}>{m.name}</h3>
                <p style={{ margin: '2px 0 8px' }}>{m.objective}</p>
                <div className="progress"><i style={{ width: `${Math.round(prog * 100)}%`, background: done ? 'var(--sun)' : undefined }} /></div>
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  {m.reqs.map((r) => (
                    <div key={r.key}>
                      {r.label}: {done ? r.target : m.scope === 'run' ? `0/${r.target} (this run)` : `${Math.min(r.target, counters[r.key] ?? 0)}/${r.target}`}
                    </div>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 8, fontSize: 13 }}>
                  <span><b>Reward:</b> {m.reward} Impact Points</span>
                </div>
                <div className="note" style={{ marginTop: 8 }}>{m.lesson}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
