import { useRun } from '../../store/runStore';
import { useApp } from '../../store/appStore';
import { getGame } from '../../game/gameRef';
import { goMenu, click } from '../../actions';
import { MISSIONS, ACHIEVEMENTS } from '../../data/progression';
import { Icon } from '../Icon';

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
