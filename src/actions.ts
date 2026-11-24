import { getGame } from './game/gameRef';
import { useApp, type RunRequest, type Screen } from './store/appStore';
import { audio } from './systems/audio/AudioManager';

export function click() {
  audio.unlock();
  audio.play('click');
}

/** Start a run. The first time a player without a name presses Play, ask for one (once). */
export function launchRun(req: RunRequest) {
  click();
  const { settings } = useApp.getState();
  if (!settings.playerName && !settings.namePrompted) {
    useApp.setState({ pendingRun: req });
    return;
  }
  startRunNow(req);
}

export function startRunNow(req: RunRequest) {
  useApp.setState({ pendingRun: null });
  useApp.getState().startRun(req);
  getGame()?.startRun(req);
}

export function goMenu() {
  getGame()?.quitToMenu();
  useApp.getState().setScreen('menu');
}

export function go(screen: Screen) {
  click();
  useApp.getState().setScreen(screen);
}
