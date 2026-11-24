import { useEffect } from 'react';
import { useRun } from '../../store/runStore';
import { getGame } from '../../game/gameRef';
import { ARTICLE_BY_ID } from '../../data/learning';
import { Icon } from '../Icon';

const LETTERS = ['A', 'B', 'C'];

export function GateModal() {
  const gate = useRun((r) => r.gate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useRun.getState().gate;
      if (!g) return;
      if (g.chosen === null) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= g.order.length) getGame()?.answerGate(g.order[n - 1]);
        const letter = LETTERS.indexOf(e.key.toUpperCase());
        if (letter >= 0 && letter < g.order.length) getGame()?.answerGate(g.order[letter]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        getGame()?.continueAfterGate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!gate) return null;
  const { scenario, order, chosen } = gate;
  const answered = chosen !== null;
  const correct = answered && scenario.options[chosen!].correct;
  const article = ARTICLE_BY_ID[scenario.learnMore];

  return (
    <div className="modal-wrap">
      <div className="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div className="gate-head">
          <Icon name="scale" size={30} color="#ffc93c" />
          <div>
            <div className="topic">Decision Gate · {scenario.topic}</div>
            <h2 id="gate-title">{scenario.title}</h2>
          </div>
        </div>
        <div className="gate-body">
          <p className="gate-situation">{scenario.situation}</p>
          <div className="gate-q">{scenario.question}</div>
          <div className="choices">
            {order.map((oi, i) => {
              const opt = scenario.options[oi];
              const isChosen = chosen === oi;
              const cls = !answered ? '' : opt.correct ? 'good' : isChosen ? 'bad' : 'dim';
              return (
                <button key={oi} className={`choice ${cls}`} disabled={answered} onClick={() => getGame()?.answerGate(oi)}>
                  <span className="letter">{LETTERS[i]}</span>
                  <span>
                    {opt.text}
                    {answered && (isChosen || opt.correct) && <div className="fb">{opt.feedback}</div>}
                  </span>
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={`result ${correct ? 'good' : 'bad'}`}>
              <div className="row">
                <span className={`badge ${correct ? 'good' : 'bad'}`}>{correct ? 'Better practice' : 'Risky choice'}</span>
                <b>{correct ? '+200 points' : gate.protectedByOversight ? 'Human Oversight caught the mistake — no health lost' : '−1 health'}</b>
              </div>
              <div>{scenario.explanation}</div>
              {article && <div className="muted" style={{ fontSize: 13 }}>Learn more later in the Knowledge Center: “{article.title}”.</div>}
              <button className="btn primary" style={{ justifySelf: 'end', marginTop: 4 }} onClick={() => getGame()?.continueAfterGate()} autoFocus>
                Continue running <Icon name="play" size={18} color="#14213d" />
              </button>
            </div>
          )}
          <div className="disclaimer">
            Scenarios are educational examples, not legal advice. Real requirements depend on your organisation, applicable laws, tool configuration and use case.
          </div>
        </div>
      </div>
    </div>
  );
}
