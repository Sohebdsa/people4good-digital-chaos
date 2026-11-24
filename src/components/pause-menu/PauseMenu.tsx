import { useState } from 'react';
import { getGame } from '../../game/gameRef';
import { goMenu, click } from '../../actions';
import { Icon } from '../Icon';
import { AudioSettings } from '../settings/SettingsScreen';

export function PauseMenu() {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="modal-wrap">
      <div className="card modal" role="dialog" aria-modal="true" aria-label="Paused">
        <h2 style={{ marginBottom: 12 }}>Paused</h2>
        {showSettings ? (
          <>
            <AudioSettings />
            <button className="btn block" style={{ marginTop: 12 }} onClick={() => { click(); setShowSettings(false); }}>
              <Icon name="back" color="#14213d" /> Back
            </button>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn primary big block" autoFocus onClick={() => { click(); getGame()?.resume(); }}>
              <Icon name="play" color="#14213d" /> Resume
            </button>
            <button className="btn block" onClick={() => { click(); getGame()?.restart(); }}>
              <Icon name="restart" color="#14213d" /> Restart
            </button>
            <button className="btn block" onClick={() => { click(); setShowSettings(true); }}>
              <Icon name="settings" color="#14213d" /> Settings
            </button>
            <button className="btn block" onClick={() => { click(); goMenu(); }}>
              <Icon name="home" color="#14213d" /> Main Menu
            </button>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Progress from this run is saved if you leave now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
