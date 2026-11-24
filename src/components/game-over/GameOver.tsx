import { useRun } from '../../store/runStore';
import { useApp } from '../../store/appStore';
import { getGame } from '../../game/gameRef';
import { goMenu, click } from '../../actions';
import { MISSIONS, ACHIEVEMENTS } from '../../data/progression';
import { Icon } from '../Icon';
import { useEffect, useRef, useState } from 'react';
import { autoSubmit, validNickname, type AutoResult } from '../../systems/leaderboard';
import { LeaderboardTable, BoardStatus } from '../leaderboard/Leaderboard';
import type { RunSummary } from '../../store/runStore';

/**
 * Posts the run to the leaderboard automatically when it ends (named players only). The client
 * skips the request when the score can't change the board (see autoSubmit), so dying repeatedly
 * with low scores sends nothing. Guests can add a name here to join.
 */
function AutoScore({ s }: { s: RunSummary }) {
  const playerName = useApp((st) => st.settings.playerName);
  const update = useApp((st) => st.updateSettings);
  const [result, setResult] = useState<AutoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sentFor = useRef<RunSummary | null>(null);

  const run = async (who: string) => {
    setBusy(true);
    const r = await autoSubmit({
      name: who,
      score: s.score,
      distance: s.distance,
      env: s.envsReached[s.envsReached.length - 1] ?? 'maze',
      gatesCorrect: s.gatesCorrect,
    });
    setBusy(false);
    setResult(r);
  };

  useEffect(() => {
    // exactly once per finished run
    if (!playerName || sentFor.current === s) return;
    sentFor.current = s;
    void run(playerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, playerName]);

  if (!playerName) {
    return (
      <div className="lb-save">
        <div className="row" style={{ marginBottom: 8 }}>
          <Icon name="trophy" color="#14213d" />
          <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>Join the leaderboard</b>
        </div>
        <div className="row">
          <input
            className="field"
            style={{ flex: '1 1 180px' }}
            maxLength={16}
            placeholder="Your name or nickname"
            aria-label="Your name or nickname"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('join-lb')?.click(); }}
          />
          <button
            id="join-lb"
            className="btn primary small"
            disabled={!name.trim()}
            onClick={() => {
              const clean = validNickname(name);
              if (!clean) return setError('Use 1–16 letters, numbers, spaces, dots, dashes or underscores.');
              click();
              update({ playerName: clean, namePrompted: true }); // effect above posts this run
            }}
          >
            Post my score
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Future runs are posted automatically under this name.</div>
        {error && <div className="login-error">{error}</div>}
      </div>
    );
  }

  let title = 'Checking the leaderboard…';
  let detail: string | null = null;
  if (result?.status === 'sent') {
    title = result.rank ? `You're #${result.rank} on the leaderboard!` : 'Score posted';
    if (!result.rank) detail = result.full ? `Top 10 needs more than ${result.cutoff.toLocaleString()}. Your best: ${result.best.toLocaleString()}.` : null;
  } else if (result?.status === 'skipped') {
    title = 'Not on the board this time';
    detail =
      result.reason === 'personal'
        ? `Your best (${result.best.toLocaleString()}) already counts. Beat it to post a new score.`
        : `Top 10 needs more than ${result.cutoff.toLocaleString()}. Beat ${result.best.toLocaleString()} to try again.`;
  } else if (result?.status === 'error') {
    title = 'Couldn’t post your score';
    detail = result.error;
  }

  return (
    <div className="lb-save">
      <div className="row" style={{ marginBottom: result?.status === 'sent' ? 8 : 2 }}>
        <Icon name="trophy" color="#14213d" />
        <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{busy ? 'Posting score…' : title}</b>
        <div className="spacer" />
        {result?.status === 'sent' && <BoardStatus online={result.online} />}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        {detail ?? (result?.status === 'sent' ? '' : `Playing as ${playerName}.`)}
      </div>
      {result?.status === 'sent' && <LeaderboardTable entries={result.entries} highlight={playerName} />}
    </div>
  );
}

export function GameOver() {
  const s = useRun((r) => r.summary);
  if (!s) return null;
  const missions = s.missionsCompleted.map((id) => MISSIONS.find((m) => m.id === id)?.name).filter(Boolean);
  const achievements = s.achievementsUnlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name).filter(Boolean);
  return (
    <div className="modal-wrap">
      <div className="card modal" style={{ width: 'min(640px, 100%)' }} role="dialog" aria-modal="true" aria-label="Run complete">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Run complete</h2>
          {s.newBest && <span className="new-best">New personal best!</span>}
        </div>
        <div className="big-score" style={{ margin: '10px 0 14px' }}>
          <div className="v">{s.score.toLocaleString()}</div>
          <div className="muted">Personal best: {s.best.toLocaleString()}</div>
        </div>
        <div className="stat-grid">
          <div className="stat-box"><div className="v">{s.distance.toLocaleString()} m</div><div className="l">Distance</div></div>
          <div className="stat-box"><div className="v">{s.tools}</div><div className="l">Digital tools</div></div>
          <div className="stat-box"><div className="v">{s.risksAvoided}</div><div className="l">Risks avoided</div></div>
          <div className="stat-box"><div className="v">{s.gatesSeen}</div><div className="l">Decision gates</div></div>
          <div className="stat-box"><div className="v">{s.gatesCorrect}/{s.gatesSeen}</div><div className="l">Correct answers</div></div>
          <div className="stat-box"><div className="v">{s.missionsCompleted.length}</div><div className="l">Missions done</div></div>
        </div>
        {(missions.length > 0 || achievements.length > 0) && (
          <div className="note" style={{ marginTop: 12 }}>
            {missions.length > 0 && <div><b>Missions completed:</b> {missions.join(', ')}</div>}
            {achievements.length > 0 && <div><b>Achievements unlocked:</b> {achievements.join(', ')}</div>}
          </div>
        )}
        <AutoScore s={s} />
        <div style={{ display: 'grid', gap: 10, marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <button className="btn primary" autoFocus onClick={() => { click(); getGame()?.restart(); }}>
            <Icon name="restart" color="#14213d" /> Play Again
          </button>
          <button className="btn teal" onClick={() => { click(); useApp.setState({ returnTo: 'menu' }); getGame()?.quitToMenu(); useApp.getState().setScreen('summary'); }}>
            <Icon name="book" color="#fff" /> Learning Summary
          </button>
          <button className="btn" onClick={() => { click(); goMenu(); }}>
            <Icon name="home" color="#14213d" /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
