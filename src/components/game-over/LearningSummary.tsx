import { useRun } from '../../store/runStore';
import { useApp } from '../../store/appStore';
import { RISK_BY_ID, RISK_CATEGORY_LABEL } from '../../data/risks';
import { TOOL_BY_ID, TOOL_GROUP_LABEL } from '../../data/tools';
import { SCENARIO_BY_ID } from '../../data/scenarios';
import { ARTICLE_BY_ID } from '../../data/learning';
import { ScreenHeader } from '../ScreenHeader';
import { launchRun, go } from '../../actions';
import { Icon, hex } from '../Icon';
import { Sprite } from '../Sprite';

const CATEGORY_ARTICLES: Record<string, string[]> = {
  data: ['unique-ids', 'data-quality', 'backups', 'central-db'],
  privacy: ['data-minimisation', 'consent', 'privacy'],
  ai: ['hallucinations', 'human-oversight', 'ai-policies', 'bias'],
};

export function LearningSummary() {
  const s = useRun((r) => r.summary);
  const lastEnv = useApp((st) => st.runRequest.env);
  if (!s) {
    return (
      <div className="screen">
        <ScreenHeader title="Learning Summary" back="menu" />
        <div className="screen-body"><div className="card">Play a run to see your learning summary.</div></div>
      </div>
    );
  }
  const tools = Object.entries(s.toolCounts).sort((a, b) => b[1] - a[1]);
  const riskIds = [...new Set([...Object.keys(s.riskHits), ...Object.keys(s.riskAvoids)])];
  const hitByCat: Record<string, number> = { data: 0, privacy: 0, ai: 0 };
  for (const [id, n] of Object.entries(s.riskHits)) hitByCat[RISK_BY_ID[id].category] += n;
  const wrongGates = s.gateResults.filter((g) => !g.correct);
  const weakest = Object.entries(hitByCat).sort((a, b) => b[1] - a[1])[0];
  const suggested = new Set<string>();
  if (weakest && weakest[1] > 0) CATEGORY_ARTICLES[weakest[0]].forEach((a) => suggested.add(a));
  wrongGates.forEach((g) => suggested.add(SCENARIO_BY_ID[g.scenarioId].learnMore));
  if (suggested.size === 0) ['what-is-dt', 'ai-policies', 'data-minimisation'].forEach((a) => suggested.add(a));
  const lessons = [
    ...wrongGates.map((g) => SCENARIO_BY_ID[g.scenarioId].explanation),
    ...Object.entries(s.riskHits).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => RISK_BY_ID[id].message),
  ];
  const uniqLessons = [...new Set(lessons)].slice(0, 5);

  return (
    <div className="screen">
      <ScreenHeader
        title="Learning Summary"
        sub={`${s.distance} m · ${s.tools} tools · ${s.gatesCorrect}/${s.gatesSeen} good decisions`}
        back="menu"
        right={<button className="btn primary small" onClick={() => launchRun({ env: lastEnv })}><Icon name="restart" color="#14213d" size={18} /> Run again</button>}
      />
      <div className="screen-body">
        <div className="grid two">
          <div className="card">
            <h3>Key lessons from this run</h3>
            {uniqLessons.length ? (
              <ul style={{ paddingLeft: 18, margin: '6px 0 0', lineHeight: 1.6 }}>{uniqLessons.map((l) => <li key={l}>{l}</li>)}</ul>
            ) : (
              <p className="muted">A clean run! Keep practising — try a later environment for tougher risks.</p>
            )}
          </div>
          <div className="card">
            <h3>Decision-making performance</h3>
            {s.gateResults.length === 0 && <p className="muted">You didn’t reach a Decision Gate this run (the first is at ~330 m).</p>}
            <div className="item-list">
              {s.gateResults.map((g, i) => (
                <div className="item" key={i} style={{ gridTemplateColumns: '36px 1fr' }}>
                  <div className="ic" style={{ width: 36, height: 36, background: g.correct ? 'var(--green)' : 'var(--red)' }}>
                    <Icon name={g.correct ? 'check' : 'x'} color="#fff" size={18} />
                  </div>
                  <div>
                    <h4>{SCENARIO_BY_ID[g.scenarioId].title}</h4>
                    <p>{SCENARIO_BY_ID[g.scenarioId].explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Tools discovered</h3>
            {tools.length === 0 && <p className="muted">No tools collected this run.</p>}
            <div className="item-list">
              {tools.map(([id, n]) => {
                const t = TOOL_BY_ID[id];
                return (
                  <div className="item" key={id}>
                    <div className="ic ic-sprite" style={{ borderColor: hex(t.color) }}><Sprite kind="items" id={id} size={52} /><span className="ic-count">{n}</span></div>
                    <div>
                      <h4>{t.name} <span className="tag" style={{ marginLeft: 4 }}>{TOOL_GROUP_LABEL[t.group]}</span></h4>
                      <p>{t.message} <i>e.g. {t.examples}</i></p>
                    </div>
                    <span />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3>Governance risks encountered</h3>
            <div className="row" style={{ marginBottom: 8 }}>
              {Object.entries(hitByCat).map(([c, n]) => (
                <span className="tag" key={c}>{RISK_CATEGORY_LABEL[c]}: {n} hit{n === 1 ? '' : 's'}</span>
              ))}
            </div>
            <div className="item-list">
              {riskIds.map((id) => {
                const r = RISK_BY_ID[id];
                const hits = s.riskHits[id] ?? 0;
                const avoids = s.riskAvoids[id] ?? 0;
                return (
                  <div className="item" key={id}>
                    <div className="ic ic-sprite" style={{ borderColor: hits ? 'var(--red)' : 'var(--teal)' }}><Sprite kind="obstacles" id={id} size={52} /></div>
                    <div>
                      <h4>{r.name}</h4>
                      <p>{r.message}</p>
                    </div>
                    <span className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{avoids} avoided<br />{hits} hit</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Suggested learning topics</h3>
          <div className="grid three" style={{ marginTop: 8 }}>
            {[...suggested].slice(0, 6).map((id) => {
              const a = ARTICLE_BY_ID[id];
              if (!a) return null;
              return (
                <button key={id} className="article-link" onClick={() => { useApp.getState().openArticle(id); useApp.setState({ returnTo: 'summary' }); go('learning'); }}>
                  <b>{a.title}</b>
                  <span>{a.summary}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
