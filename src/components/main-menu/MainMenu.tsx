import { useApp } from '../../store/appStore';
import { MISSIONS, ACHIEVEMENTS } from '../../data/progression';
import { Icon, Logo } from '../Icon';
import { go, launchRun } from '../../actions';
import { useIsAdmin } from '../../systems/auth';

/**
 * Main menu: one fixed panel that always fits the screen (no scrolling).
 * Order: brand → who's playing → title → Play → 2×2 feature grid → stats + settings.
 */
export function MainMenu() {
  const profile = useApp((s) => s.profile);
  const setScreen = useApp((s) => s.setScreen);
  const multipleEnvs = profile.unlockedEnvs.length > 1;
  const playerName = useApp((s) => s.settings.playerName);
  const isAdmin = useIsAdmin();

  const open = (s: Parameters<typeof setScreen>[0]) => {
    useApp.setState({ returnTo: 'menu' });
    go(s);
  };

  return (
    <div className="menu">
      <div className="menu-panel">
        <header className="menu-head">
          <Logo size={50} />
          <div>
            <div className="brand-word">People4good</div>
            <div className="logo-sub">AI Lab · Digital Transformation</div>
          </div>
        </header>

        <button className="account-chip" onClick={() => open('login')} aria-label="Change name or log in">
          <Icon name={isAdmin ? 'lock' : 'users'} size={15} color="#ffc93c" />
          <span>{playerName ? <>Playing as <b>{playerName}</b></> : 'Playing as guest'}</span>
          {isAdmin && <span className="admin-badge">Admin</span>}
          <span className="account-action">{playerName || isAdmin ? 'Change' : 'Enter name'}</span>
        </button>

        <div>
          <h1 className="title">
            Escape the <span>Digital Chaos</span>
          </h1>
          <p className="tagline">
            Run through paperwork mazes, spreadsheet cities and AI frontiers. Collect the tools, dodge the risks and rebuild your NGO.
          </p>
        </div>

        <button className="btn primary big menu-play" onClick={() => (multipleEnvs ? open('play-select') : launchRun({ env: 'maze' }))}>
          <Icon name="play" color="#14213d" /> Play
        </button>

        <nav className="menu-grid" aria-label="Main menu">
          <button className="btn" onClick={() => open('learning')}>
            <Icon name="book" color="#14213d" /> Learning
          </button>
          <button className="btn" onClick={() => open('missions')}>
            <Icon name="target" color="#14213d" /> Missions
          </button>
          <button className="btn" onClick={() => open('achievements')}>
            <Icon name="star" color="#14213d" /> Achievements
          </button>
          <button className="btn violet" onClick={() => open('leaderboard')}>
            <Icon name="trophy" color="#fff" /> Leaderboard
          </button>
        </nav>

        <footer className="menu-foot">
          <div className="menu-stats">
            <span className="stat" title="Best score"><b>{profile.best.toLocaleString()}</b> best</span>
            <span className="stat" title="Impact points"><b>{profile.impact.toLocaleString()}</b> impact</span>
            <span className="stat" title="Missions completed"><b>{profile.missionsDone.length}/{MISSIONS.length}</b> missions</span>
            <span className="stat" title="Achievements unlocked"><b>{profile.achievements.length}/{ACHIEVEMENTS.length}</b> badges</span>
          </div>
          <button className="icon-btn menu-settings" aria-label="Settings" title="Settings" onClick={() => open('settings')}>
            <Icon name="settings" color="#14213d" />
          </button>
        </footer>
      </div>
      <div className="menu-right">
        <div className="env-chip">
          Meet <b>Kiri</b>, field-operations lead and digital explorer. Tap anywhere to enable sound.
        </div>
      </div>
    </div>
  );
}
