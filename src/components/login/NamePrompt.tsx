import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { validNickname } from '../../systems/leaderboard';
import { startRunNow, click } from '../../actions';
import { Icon } from '../Icon';

/**
 * One-time pop-up shown when a player presses Play without a name. Entering a name puts their
 * scores on the leaderboard automatically; "Play as guest" starts straight away and is not asked again.
 */
export function NamePrompt() {
  const pending = useApp((s) => s.pendingRun);
  const update = useApp((s) => s.updateSettings);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!pending) return null;

  const start = (withName: boolean) => {
    if (withName) {
      const clean = validNickname(name);
      if (!clean) {
        setError('Use 1–16 letters, numbers, spaces, dots, dashes or underscores.');
        return;
      }
      update({ playerName: clean, namePrompted: true });
    } else {
      update({ namePrompted: true });
    }
    click();
    startRunNow(pending);
  };

  return (
    <div className="modal-wrap">
      <div className="card modal name-prompt" role="dialog" aria-modal="true" aria-labelledby="name-title">
        <h2 id="name-title" style={{ fontSize: 26 }}>Join the leaderboard?</h2>
        <p className="muted" style={{ margin: '4px 0 14px' }}>
          Enter a name and your best score is posted to the top 10 automatically when a run ends.
        </p>
        <input
          className="field"
          autoFocus
          maxLength={16}
          placeholder="Your name or nickname"
          aria-label="Your name or nickname"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) start(true); }}
        />
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Shown to everyone, so a first name, nickname or team name is best.</div>
        {error && <div className="login-error">{error}</div>}
        <button className="btn primary big block" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={() => start(true)}>
          <Icon name="play" color="#14213d" /> Start running
        </button>
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => start(false)}>
          Play as guest
        </button>
        <button className="login-skip" onClick={() => { click(); useApp.setState({ pendingRun: null }); }}>Cancel</button>
      </div>
    </div>
  );
}
