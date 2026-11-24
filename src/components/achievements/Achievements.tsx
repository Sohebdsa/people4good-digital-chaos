import { useApp } from '../../store/appStore';
import { ACHIEVEMENTS, reqProgress } from '../../data/progression';
import { ScreenHeader } from '../ScreenHeader';
import { Icon } from '../Icon';

export function Achievements() {
  const profile = useApp((s) => s.profile);
  const counters = profile.counters ?? {};
  return (
    <div className="screen">
      <ScreenHeader title="Achievements" sub={`${profile.achievements.length}/${ACHIEVEMENTS.length} unlocked · saved on this device`} />
      <div className="screen-body ui-scroll">
        <div className="grid three">
          {ACHIEVEMENTS.map((a) => {
            const got = profile.achievements.includes(a.id);
            const prog = got ? 1 : reqProgress(a.reqs, counters);
            return (
              <div className={`card ach ${got ? '' : 'locked'}`} key={a.id}>
                <div className="medal"><Icon name={a.icon} size={34} color={got ? '#14213d' : '#8a8578'} /></div>
                <h3>{a.name}</h3>
                <div className="muted" style={{ fontSize: 14 }}>{a.description}</div>
                <div className="progress" style={{ width: '100%' }}><i style={{ width: `${Math.round(prog * 100)}%`, background: got ? 'var(--sun)' : undefined }} /></div>
                <div className="muted" style={{ fontSize: 12 }}>{got ? 'Unlocked' : `${Math.round(prog * 100)}%`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
