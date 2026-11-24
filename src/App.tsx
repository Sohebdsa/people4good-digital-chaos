import { useEffect, useRef, useState } from 'react';
import { Game } from './game/engine/Game';
import { getGame, setGame } from './game/gameRef';
import { useApp } from './store/appStore';
import { MainMenu } from './components/main-menu/MainMenu';
import { PlaySelect } from './components/main-menu/PlaySelect';
import { GameUI } from './components/game-hud/GameUI';
import { LearningSummary } from './components/game-over/LearningSummary';
import { LearningCenter } from './components/learning-center/LearningCenter';
import { Assessment } from './components/assessment/Assessment';
import { Workshop } from './components/workshop/Workshop';
import { Missions } from './components/achievements/Missions';
import { Achievements } from './components/achievements/Achievements';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { Leaderboard } from './components/leaderboard/Leaderboard';
import { LoginScreen } from './components/login/LoginScreen';
import { NamePrompt } from './components/login/NamePrompt';

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const screen = useApp((s) => s.screen);
  const settings = useApp((s) => s.settings);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let g: Game | null = null;
    try {
      g = new Game(host.current);
      setGame(g);
      // dev-only handle for automated testing (stripped from production builds)
      if (import.meta.env.DEV) (window as unknown as { __p4g: Game }).__p4g = g;
      // a fresh engine always starts at the menu
      if (useApp.getState().screen === 'game') useApp.getState().setScreen('menu');
    } catch (e) {
      console.warn('WebGL unavailable', e);
      setWebglError(true);
    }
    const unlock = () => getGame()?.ensureAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      g?.dispose();
      setGame(null);
    };
  }, []);

  useEffect(() => {
    getGame()?.applySettings();
  }, [settings]);

  return (
    <div className="app">
      <div className="game-layer" ref={host} />
      <div className="overlay">
        {webglError && (
          <div className="modal-wrap">
            <div className="card modal">
              <h2>3D graphics unavailable</h2>
              <p>
                Your browser could not start WebGL, so the runner cannot be displayed. The Learning Center and self-assessment
                still work from the menu. Try enabling hardware acceleration or another browser to play.
              </p>
            </div>
          </div>
        )}
        {screen === 'menu' && <MainMenu />}
        {screen === 'play-select' && <PlaySelect />}
        {screen === 'game' && <GameUI />}
        {screen === 'summary' && <LearningSummary />}
        {screen === 'learning' && <LearningCenter />}
        {screen === 'assessment' && <Assessment />}
        {screen === 'workshop' && <Workshop />}
        {screen === 'missions' && <Missions />}
        {screen === 'achievements' && <Achievements />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'leaderboard' && <Leaderboard />}
        {screen === 'login' && <LoginScreen />}
        <NamePrompt />
      </div>
    </div>
  );
}
