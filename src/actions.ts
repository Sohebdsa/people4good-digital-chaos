import { getGame } from './game/gameRef';
import { useApp, type RunRequest, type Screen } from './store/appStore';
import { audio } from './systems/audio/AudioManager';

export function click() {
  audio.unlock();
  audio.play('click');
}

export function launchRun(req: RunRequest) {
  click();
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
