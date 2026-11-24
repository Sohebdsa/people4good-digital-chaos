import { useApp } from '../../store/appStore';
import { MISSIONS, ACHIEVEMENTS } from '../../data/progression';
import { Icon, Logo } from '../Icon';
import { go, launchRun } from '../../actions';

export function MainMenu() {
  const profile = useApp((s) => s.profile);
  const setScreen = useApp((s) => s.setScreen);
  const multipleEnvs = profile.unlockedEnvs.length > 1;

  const open = (s: Parameters<typeof setScreen>[0]) => {
    useApp.setState({ returnTo: 'menu' });
    go(s);
  };

  return (
    <div className="menu">
      <div className="menu-left">
        <div className="logo">
          <Logo />
          <div>
            <div className="logo-word">
              PEOPLE<b>4</b>GOOD
            </div>
            <div className="logo-sub">AI Lab · Digital Transformation</div>
          </div>
        </div>
        <h1 className="title">
          Escape the
          <span>Digital Chaos</span>
        </h1>
        <p className="tagline">
          Run through paperwork mazes, spreadsheet cities and AI frontiers. Collect the tools, dodge the risks, make the right calls — and
          rebuild your NGO along the way.
        </p>
        <div className="menu-buttons">
          <button className="btn primary big" onClick={() => (multipleEnvs ? open('play-select') : launchRun({ env: 'maze' }))}>
            <Icon name="play" color="#14213d" /> Play
          </button>
          <div className="grid-2">
            <button className="btn teal" onClick={() => open('workshop')}>
              <Icon name="users" color="#fff" /> Workshop Mode
            </button>
            <button className="btn" onClick={() => open('learning')}>
              <Icon name="book" color="#14213d" /> Learning Center
            </button>
            <button className="btn" onClick={() => open('assessment')}>
              <Icon name="chart" color="#14213d" /> Maturity Assessment
            </button>
            <button className="btn" onClick={() => open('roadmap')}>
              <Icon name="map" color="#14213d" /> 90-Day Roadmap
            </button>
            <button className="btn" onClick={() => open('missions')}>
              <Icon name="target" color="#14213d" /> Missions
            </button>
            <button className="btn" onClick={() => open('achievements')}>
              <Icon name="trophy" color="#14213d" /> Achievements
            </button>
          </div>
          <button className="btn ghost" onClick={() => open('settings')}>
            <Icon name="settings" color="#fff" /> Settings
          </button>
        </div>
        <div className="menu-stats">
          <div className="stat"><b>{profile.best.toLocaleString()}</b>best score</div>
          <div className="stat"><b>{profile.impact.toLocaleString()}</b>impact pts</div>
          <div className="stat"><b>{profile.missionsDone.length}/{MISSIONS.length}</b>missions</div>
          <div className="stat"><b>{profile.achievements.length}/{ACHIEVEMENTS.length}</b>achievements</div>
        </div>
      </div>
      <div className="menu-right">
        <div className="env-chip">
          Meet <b>Kiri</b>, field-operations lead and digital explorer. Tap anywhere to enable sound.
        </div>
      </div>
    </div>
  );
}
