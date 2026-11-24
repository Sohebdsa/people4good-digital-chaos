import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { ScreenHeader } from '../ScreenHeader';
import { audio } from '../../systems/audio/AudioManager';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function AudioSettings() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.updateSettings);
  return (
    <div>
      <div className="setting">
        <div><b>Music volume</b></div>
        <input type="range" min={0} max={1} step={0.05} value={s.music} aria-label="Music volume" onChange={(e) => update({ music: +e.target.value })} />
      </div>
      <div className="setting">
        <div><b>Sound effects volume</b></div>
        <input
          type="range" min={0} max={1} step={0.05} value={s.sfx} aria-label="Sound effects volume"
          onChange={(e) => update({ sfx: +e.target.value })}
          onPointerUp={() => audio.play('chime')}
        />
      </div>
      <div className="setting">
        <div><b>Mute all audio</b></div>
        <Switch on={s.muted} label="Mute" onChange={(v) => update({ muted: v })} />
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.updateSettings);
  const reset = useApp((st) => st.resetProgress);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen">
      <ScreenHeader title="Settings" back="menu" />
      <div className="screen-body">
        <div className="grid two">
          <div className="card">
            <h3>Audio</h3>
            <AudioSettings />
          </div>
          <div className="card">
            <h3>Graphics & comfort</h3>
            <div className="setting">
              <div>
                <b>Graphics quality</b>
                <div className="muted" style={{ fontSize: 13 }}>Low disables shadows and high-DPI rendering for slower devices.</div>
              </div>
              <div className="seg">
                {(['high', 'low'] as const).map((q) => (
                  <button key={q} className={s.quality === q ? 'on' : ''} onClick={() => update({ quality: q })}>{q === 'high' ? 'High' : 'Low'}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div>
                <b>Sprite style</b>
                <div className="muted" style={{ fontSize: 13 }}>Icons and pictures in the Knowledge Center, start picker and in-run messages.</div>
              </div>
              <div className="seg">
                {(['realistic', 'illustrated'] as const).map((st) => (
                  <button key={st} className={s.spriteStyle === st ? 'on' : ''} onClick={() => update({ spriteStyle: st })}>{st === 'realistic' ? 'Realistic' : 'Illustrated'}</button>
                ))}
              </div>
            </div>
            <div className="setting">
              <div>
                <b>Reduce motion</b>
                <div className="muted" style={{ fontSize: 13 }}>Turns off camera shake.</div>
              </div>
              <Switch on={s.reduceMotion} label="Reduce motion" onChange={(v) => update({ reduceMotion: v })} />
            </div>
            <div className="setting">
              <div>
                <b>Show control hints</b>
                <div className="muted" style={{ fontSize: 13 }}>Display the controls overlay at the start of each run.</div>
              </div>
              <Switch on={s.showHints} label="Show hints" onChange={(v) => update({ showHints: v })} />
            </div>
          </div>
          <div className="card">
            <h3>Privacy & data</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              Everything — scores, progress, assessment answers and workshop notes — is stored only in this browser (localStorage).
              Nothing is sent to a server. The game never asks for personal information.
            </p>
            {!confirm ? (
              <button className="btn coral" onClick={() => setConfirm(true)}>Reset all progress…</button>
            ) : (
              <div className="row">
                <span><b>Delete all saved progress on this device?</b> This cannot be undone.</span>
                <button className="btn coral small" onClick={() => { reset(); setConfirm(false); }}>Yes, reset</button>
                <button className="btn small" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Credits</h3>
            <p className="muted" style={{ fontSize: 14 }}>
              PEOPLE4GOOD: Escape the Digital Chaos — an educational game for NGO digital transformation and responsible AI.
              All 3D art, music and sound effects are generated procedurally in the browser. Tool names mentioned are examples, not endorsements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
