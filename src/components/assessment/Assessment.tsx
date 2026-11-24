import { useMemo, useState } from 'react';
import { useApp } from '../../store/appStore';
import {
  ASSESSMENT, ASSESSMENT_DISCLAIMER, SCALE, categoryScore, overallScore, isComplete, maturityLevel,
} from '../../data/assessment';
import { generateRoadmap } from '../../data/roadmap';
import { ScreenHeader } from '../ScreenHeader';
import { Radar, ScoreRing } from './Radar';
import { Icon } from '../Icon';
import { click, go } from '../../actions';
import { setFlagAndCheck } from '../../systems/progression';

export function AssessmentResults({ compact = false }: { compact?: boolean }) {
  const answers = useApp((s) => s.assessment.answers);
  const focus = useApp((s) => s.assessment.focus);
  const setAssessment = useApp((s) => s.setAssessment);
  const scores = useMemo(() => Object.fromEntries(ASSESSMENT.map((c) => [c.id, categoryScore(answers, c.id)])), [answers]);
  const overall = overallScore(answers);
  const level = maturityLevel(overall);
  const sorted = [...ASSESSMENT].sort((a, b) => scores[b.id] - scores[a.id]);
  const strengths = sorted.filter((c) => scores[c.id] >= 60).slice(0, 3);
  const improve = [...sorted].reverse().filter((c) => scores[c.id] < 60).slice(0, 3);
  const toggleFocus = (id: string) => setAssessment({ focus: focus.includes(id) ? focus.filter((f) => f !== id) : [...focus, id] });

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <div className="card" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
          <span className="tag">Educational self-assessment</span>
          <ScoreRing value={overall} />
          <div>
            <h3 style={{ fontSize: 24 }}>{level.name}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>{level.description}</p>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center' }}>
          <Radar data={ASSESSMENT.map((c) => ({ label: c.name, value: scores[c.id], color: c.color }))} />
        </div>
      </div>
      <div className="grid two">
        <div className="card">
          <h3>Category scores</h3>
          {ASSESSMENT.map((c) => (
            <div className="cat-bar" key={c.id}>
              <div className="name">{c.name} <small>· weight {c.weight}%</small></div>
              <div className="pct">{scores[c.id]}%</div>
              <div className="progress"><i style={{ width: `${scores[c.id]}%`, background: c.color }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Strengths</h3>
          {strengths.length ? strengths.map((c) => (
            <p key={c.id} style={{ margin: '6px 0' }}><b style={{ color: c.color }}>{c.name}:</b> {c.strength}</p>
          )) : <p className="muted">No area scores 60% or more yet — that’s normal for many NGOs. Every journey starts somewhere.</p>}
          <h3 style={{ marginTop: 14 }}>Improvement areas</h3>
          {improve.length ? improve.map((c) => (
            <div key={c.id} style={{ margin: '8px 0' }}>
              <b style={{ color: c.color }}>{c.name}:</b> {c.improve}
              <div className="muted" style={{ fontSize: 13 }}>Next steps: {c.nextSteps.join(' · ')}</div>
            </div>
          )) : <p className="muted">All areas are at 60% or above. Focus on consistency, governance and sharing what works.</p>}
        </div>
      </div>
      {!compact && (
        <div className="card">
          <h3>Choose your priority areas</h3>
          <p className="muted" style={{ marginTop: 0 }}>Weak areas are prioritised automatically. Tick any area you want to emphasise in your roadmap.</p>
          <div className="row">
            {ASSESSMENT.map((c) => (
              <button key={c.id} className={`problem ${focus.includes(c.id) ? 'on' : ''}`} style={{ flex: '1 1 160px' }} onClick={() => toggleFocus(c.id)}>
                <span>{focus.includes(c.id) ? '★' : '☆'}</span>
                <span><b>{c.name}</b>{scores[c.id]}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="note">{ASSESSMENT_DISCLAIMER}</div>
    </div>
  );
}

export function Assessment() {
  const answers = useApp((s) => s.assessment.answers);
  const completedAt = useApp((s) => s.assessment.completedAt);
  const focus = useApp((s) => s.assessment.focus);
  const setAssessment = useApp((s) => s.setAssessment);
  const roadmap = useApp((s) => s.roadmap);
  const setRoadmap = useApp((s) => s.setRoadmap);
  const complete = isComplete(answers);
  const [step, setStep] = useState<number>(completedAt && complete ? ASSESSMENT.length : 0);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  const setAnswer = (cat: string, qi: number, v: number) => {
    // read the latest state so quick successive taps never overwrite each other
    const latest = useApp.getState().assessment.answers;
    const arr = [...(latest[cat] ?? [])];
    arr[qi] = v;
    setAssessment({ answers: { ...latest, [cat]: arr } });
  };

  const finish = () => {
    click();
    setAssessment({ completedAt: new Date().toISOString() });
    setUnlocked(setFlagAndCheck('flag:assessment'));
    setStep(ASSESSMENT.length);
  };

  const [confirmReplace, setConfirmReplace] = useState(false);
  const buildRoadmap = (replace: boolean) => {
    if (roadmap.items.length > 0 && !replace) {
      setConfirmReplace(true);
      return;
    }
    const scores = Object.fromEntries(ASSESSMENT.map((c) => [c.id, categoryScore(answers, c.id)]));
    setRoadmap({ items: generateRoadmap(scores, focus), createdAt: new Date().toISOString() });
    setFlagAndCheck('flag:roadmap');
    openRoadmap();
  };
  const openRoadmap = () => {
    useApp.setState({ returnTo: 'assessment' });
    go('roadmap');
  };

  const cat = ASSESSMENT[step];
  const catDone = (id: string) => (answers[id] ?? []).every((v) => v !== null && v !== undefined);

  return (
    <div className="screen">
      <ScreenHeader
        title="Digital Maturity Self-Assessment"
        sub="Separate from your game score — this is about your real organisation."
        right={complete && step === ASSESSMENT.length ? (
          <button className="btn primary small" onClick={() => buildRoadmap(false)}><Icon name="map" size={18} color="#14213d" /> Build 90-day roadmap</button>
        ) : undefined}
      />
      <div className="screen-body ui-scroll">
        <div className="steps">
          {ASSESSMENT.map((c, i) => (
            <button key={c.id} className={`step ${step === i ? 'on' : ''} ${catDone(c.id) ? 'done' : ''}`} onClick={() => { click(); setStep(i); }}>
              {i + 1}. {c.name}
            </button>
          ))}
          <button className={`step ${step === ASSESSMENT.length ? 'on' : ''}`} disabled={!complete} onClick={() => complete && setStep(ASSESSMENT.length)}>
            Results
          </button>
        </div>
        {unlocked.length > 0 && <div className="note" style={{ marginBottom: 12, background: '#f3eaff' }}>Achievement unlocked: <b>{unlocked.join(', ')}</b></div>}

        {cat ? (
          <div className="card">
            <div className="row">
              <span className="tag" style={{ background: cat.color, color: '#fff' }}>Weight {cat.weight}%</span>
              <span className="muted" style={{ fontSize: 13 }}>Area {step + 1} of {ASSESSMENT.length}</span>
            </div>
            <h3 style={{ fontSize: 24, marginTop: 8 }}>{cat.name}</h3>
            {cat.questions.map((q, qi) => (
              <div className="q" key={qi}>
                <div className="q-text">{qi + 1}. {q}</div>
                <div className="scale" role="radiogroup" aria-label={q}>
                  {SCALE.map((sc) => (
                    <button
                      key={sc.value}
                      role="radio"
                      aria-checked={answers[cat.id]?.[qi] === sc.value}
                      className={answers[cat.id]?.[qi] === sc.value ? 'on' : ''}
                      onClick={() => setAnswer(cat.id, qi, sc.value)}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" disabled={step === 0} onClick={() => { click(); setStep(step - 1); }}>
                <Icon name="back" size={18} color="#14213d" /> Previous
              </button>
              <div className="spacer" />
              {step < ASSESSMENT.length - 1 ? (
                <button className="btn primary" onClick={() => { click(); setStep(step + 1); }}>Next area</button>
              ) : (
                <button className="btn primary" disabled={!complete} onClick={finish}>
                  {complete ? 'See my results' : 'Answer every question to finish'}
                </button>
              )}
            </div>
            <div className="disclaimer">Tip: answer for your organisation as it is today, not as you hope it will be. “Not yet” is a perfectly good answer.</div>
          </div>
        ) : (
          <>
            <AssessmentResults />
            {confirmReplace ? (
              <div className="card" style={{ marginTop: 16 }}>
                <b>You already have a roadmap.</b> Generate a new one from these results (replacing your edits), or open the existing one?
                <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => { setConfirmReplace(false); openRoadmap(); }}>Open existing roadmap</button>
                  <button className="btn coral" onClick={() => { setConfirmReplace(false); buildRoadmap(true); }}>Replace with new roadmap</button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => { click(); setStep(0); }}>Review answers</button>
                <button className="btn primary" onClick={() => buildRoadmap(false)}><Icon name="map" size={18} color="#14213d" /> Build my 90-day roadmap</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
