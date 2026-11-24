export type Action = 'left' | 'right' | 'jump' | 'slide' | 'pause';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'slide', KeyS: 'slide',
  Escape: 'pause', KeyP: 'pause',
};

/** Keyboard + swipe input. Swipes fire as soon as the threshold is crossed for responsiveness. */
export class Input {
  private onAction: (a: Action) => void;
  private sx = 0;
  private sy = 0;
  private tracking = false;
  private fired = false;
  enabled = true;

  constructor(onAction: (a: Action) => void) {
    this.onAction = onAction;
    window.addEventListener('keydown', this.key);
    window.addEventListener('touchstart', this.tStart, { passive: true });
    window.addEventListener('touchmove', this.tMove, { passive: false });
    window.addEventListener('touchend', this.tEnd, { passive: true });
  }

  private isUi(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return !!el?.closest?.('button, input, textarea, select, a, .ui-scroll, .gate-card');
  }

  private key = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    const a = KEYMAP[e.code];
    if (!a) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (a !== 'pause' && e.repeat) return;
    e.preventDefault();
    this.onAction(a);
  };

  private tStart = (e: TouchEvent) => {
    if (!this.enabled || this.isUi(e.target)) {
      this.tracking = false;
      return;
    }
    const t = e.touches[0];
    this.sx = t.clientX;
    this.sy = t.clientY;
    this.tracking = true;
    this.fired = false;
  };

  private tMove = (e: TouchEvent) => {
    if (!this.tracking) return;
    e.preventDefault();
    if (this.fired) return;
    const t = e.touches[0];
    const dx = t.clientX - this.sx;
    const dy = t.clientY - this.sy;
    const th = Math.max(24, Math.min(window.innerWidth, window.innerHeight) * 0.05);
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    this.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx > 0 ? 'right' : 'left');
    else this.onAction(dy > 0 ? 'slide' : 'jump');
  };

  private tEnd = () => {
    this.tracking = false;
  };

  dispose() {
    window.removeEventListener('keydown', this.key);
    window.removeEventListener('touchstart', this.tStart);
    window.removeEventListener('touchmove', this.tMove);
    window.removeEventListener('touchend', this.tEnd);
  }
}
