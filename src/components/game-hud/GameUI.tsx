import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useRun } from '../../store/runStore';
import { useApp } from '../../store/appStore';
import { getGame } from '../../game/gameRef';
import { ENV_BY_ID } from '../../data/environments';
import { POWER_BY_ID } from '../../data/tools';
import { Icon, hex } from '../Icon';
import { GateModal } from '../decision-gate/GateModal';
import { Sprite, spriteUrl } from '../Sprite';
import { PauseMenu } from '../pause-menu/PauseMenu';
import { GameOver } from '../game-over/GameOver';

function Hearts({ health, max }: { health: number; max: number }) {
  return (
    <div className="pill hearts" aria-label={`Health ${health} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="heart" color={i < health ? '#ff4d6d' : 'rgba(255,255,255,0.22)'} />
      ))}
    </div>
  );
}

function HUD() {
  const s = useRun(
    useShallow((r) => ({
      score: r.score, distance: r.distance, health: r.health, maxHealth: r.maxHealth, tools: r.tools, combo: r.combo,
      multiplier: r.multiplier, env: r.env, envProgress: r.envProgress, missionLabel: r.missionLabel,
      missionProgress: r.missionProgress, missionDetail: r.missionDetail, powers: r.powers, phase: r.phase,
    })),
  );
  const env = ENV_BY_ID[s.env];
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="pill score-pill">
          <div className="lbl">Score</div>
          <div className="val">{s.score.toLocaleString()}</div>
          <div className="lbl" style={{ marginTop: 2 }}>{s.distance.toLocaleString()} m</div>
        </div>
        <Hearts health={s.health} max={s.maxHealth} />
        <div className="pill tools-pill" title="Digital tools collected">
          <Icon name="box" color="#ffc93c" />
          <span key={s.tools} className="count-pop" style={{ fontSize: 20, fontWeight: 700 }}>{s.tools}</span>
        </div>
        <div className="hud-mid">
          <div className="pill env-bar">
            <span>{env.name}</span>
            <span className="track"><i style={{ width: `${Math.round(s.envProgress * 100)}%` }} /></span>
          </div>
          {s.multiplier > 1 && (
            <div className="combo">
              x{s.multiplier} {s.combo >= 8 ? `· combo ${s.combo}` : ''}
            </div>
          )}
        </div>
        <div className="hud-right">
          {s.missionLabel && (
            <div className="pill mission-pill">
              <div className="lbl">Mission</div>
              <div className="name">{s.missionLabel}</div>
              <div className="detail">{s.missionDetail}</div>
              <div className="progress"><i style={{ width: `${Math.round(s.missionProgress * 100)}%` }} /></div>
            </div>
          )}
          <button className="icon-btn" aria-label="Pause" onClick={() => getGame()?.pause()}>
            <Icon name="pause" color="#14213d" />
          </button>
        </div>
      </div>
      <div className="powers">
        {s.powers.map((p) => {
          const def = POWER_BY_ID[p.id];
          return (
            <div className="power" key={p.id}>
              <div className="dot sprite-dot" style={{ background: hex(def.color) }}>
                <Sprite kind="powerups" id={p.id} size={30} />
              </div>
              <div style={{ flex: 1 }}>
                <div>{def.short}</div>
                <div className="bar"><i style={{ width: `${(p.remaining / p.duration) * 100}%` }} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toasts() {
  const toasts = useRun((r) => r.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind === 'mission' || t.kind === 'achievement' ? 'big' : ''} ${t.kind === 'env' ? 'env' : ''}`}
          style={{ ['--c' as string]: t.color }}
        >
          {t.icon && <img className="toast-icon" src={spriteUrl(t.icon.split('/')[0] as 'items', t.icon.split('/')[1])} alt="" aria-hidden="true" />}
          <div className="toast-body">
            <div className="t">{t.kind === 'risk' ? '⚠ ' : ''}{t.title}</div>
            <div className="x">{t.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Brief red edge vignette on a hit (one per hit, well under 3 flashes/s; softened with reduce motion). */
function HitFlash() {
  const n = useRun((r) => r.hitFlash);
  const reduce = useApp((s) => s.settings.reduceMotion);
  if (!n) return null;
  return <div key={n} className={`hit-flash ${reduce ? 'soft' : ''}`} aria-hidden="true" />;
}

function Countdown() {
  const { phase, countdown } = useRun(useShallow((r) => ({ phase: r.phase, countdown: r.countdown })));
  if (phase !== 'countdown' || countdown <= 0) return null;
  return (
    <div className="countdown">
      <span key={countdown}>{countdown}</span>
    </div>
  );
}

function Hint() {
  const hint = useRun((r) => r.hint);
  if (!hint) return null;
  const touch = typeof window !== 'undefined' && 'ontouchstart' in window;
  return (
    <div className="hint">
      <div><span className="k">{touch ? 'Swipe ←/→' : 'A/D or ←/→'}</span><br />Change lane</div>
      <div><span className="k">{touch ? 'Swipe ↑' : 'W/↑/Space'}</span><br />Jump</div>
      <div><span className="k">{touch ? 'Swipe ↓' : 'S/↓'}</span><br />Slide</div>
      <div><span className="k">{touch ? 'Pause ⏸' : 'Esc'}</span><br />Pause</div>
      <div className="legend">
        <span style={{ ['--c' as string]: '#ffb627' }}>Low risk: jump</span>
        <span style={{ ['--c' as string]: '#5ef2ff' }}>Floating risk: slide</span>
        <span style={{ ['--c' as string]: '#e63946' }}>Wall: change lane</span>
      </div>
    </div>
  );
}

export function GameUI() {
  const phase = useRun((r) => r.phase);
  const setScreen = useApp((s) => s.setScreen);
  useEffect(() => {
    // ensure a game is running when this screen mounts without one (e.g. hot reload)
    const g = getGame();
    if (g && g.state === 'menu') setScreen('menu');
  }, [setScreen]);
  return (
    <>
      <HitFlash />
      {phase !== 'over' && <HUD />}
      <Toasts />
      <Countdown />
      {(phase === 'countdown' || phase === 'running') && <Hint />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'gate' && <GateModal />}
      {phase === 'over' && <GameOver />}
    </>
  );
}
