import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { go } from '../actions';
import { useApp, type Screen } from '../store/appStore';

export function ScreenHeader({ title, sub, back, right }: { title: string; sub?: string; back?: Screen; right?: ReactNode }) {
  const returnTo = useApp((s) => s.returnTo);
  return (
    <div className="screen-head">
      <button className="icon-btn" aria-label="Back" onClick={() => go(back ?? returnTo ?? 'menu')}>
        <Icon name="back" color="#14213d" />
      </button>
      <div>
        <h2>{title}</h2>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="spacer" />
      {right}
    </div>
  );
}
