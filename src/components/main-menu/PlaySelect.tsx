import { useApp } from '../../store/appStore';
import { ENVIRONMENTS } from '../../data/environments';
import { ScreenHeader } from '../ScreenHeader';
import { launchRun } from '../../actions';
import { hex, Icon } from '../Icon';
import { spriteUrl } from '../Sprite';

export function PlaySelect() {
  const unlocked = useApp((s) => s.profile.unlockedEnvs);
  useApp((s) => s.settings.spriteStyle); // re-render backdrops when the style changes
  return (
    <div className="screen">
      <ScreenHeader title="Choose your starting point" sub="Reach an environment once to unlock it as a start." back="menu" />
      <div className="screen-body">
        <div className="grid three">
          {ENVIRONMENTS.map((e, i) => {
            const open = unlocked.includes(e.id);
            return (
              <button
                key={e.id}
                className={`env-card ${open ? '' : 'locked'}`}
                disabled={!open}
                onClick={() => launchRun({ env: e.id })}
              >
                <div className="sw" style={{ background: `center / cover no-repeat url(${spriteUrl('backgrounds', e.id)}), linear-gradient(135deg, ${hex(e.sky)}, ${hex(e.ground)})` }}>
                  <span>{i + 1}. {e.name}</span>
                </div>
                <div className="info">
                  <b>{e.theme}</b>
                  <div className="muted" style={{ marginTop: 4 }}>{open ? e.tagline : `Locked — reach it in a run (${e.startDistance} m).`}</div>
                  {!open && <Icon name="lock" size={16} color="#5b6478" style={{ marginTop: 6 }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
