import type { CSSProperties } from 'react';

const PATHS: Record<string, string> = {
  heart: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.4 1.1 4.1 2.4h3C14.2 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  play: 'M7 4l13 8-13 8z',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 4.6v-2.2l-2.3-.6a7 7 0 0 0-.7-1.7l1.2-2-1.6-1.6-2 1.2a7 7 0 0 0-1.7-.7L13.3 3h-2.2l-.6 2.3a7 7 0 0 0-1.7.7l-2-1.2-1.6 1.6 1.2 2a7 7 0 0 0-.7 1.7L3 10.9v2.2l2.3.6c.2.6.4 1.2.7 1.7l-1.2 2 1.6 1.6 2-1.2c.5.3 1.1.5 1.7.7l.6 2.3h2.2l.6-2.3c.6-.2 1.2-.4 1.7-.7l2 1.2 1.6-1.6-1.2-2c.3-.5.5-1.1.7-1.7z',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  chart: 'M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0zM4 5h3v3a3 3 0 0 1-3-3zM20 5h-3v3a3 3 0 0 0 3-3zM10 14h4v3h3v3H7v-3h3z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 20c0-3.9 3.6-6 8-6s8 2.1 8 6zm17 0c0-1.8-.6-3.3-1.7-4.4C20 15.8 23 17.4 23 20z',
  back: 'M15 4l-8 8 8 8',
  check: 'M4 12l5 5L20 6',
  x: 'M5 5l14 14M19 5L5 19',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4 6l-2.5 5.5L8 16l2.5-5.5z',
  shield: 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z',
  spark: 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z',
  scale: 'M12 3v18M5 21h14M4 8h16M4 8l-3 6a3 3 0 0 0 6 0zM20 8l-3 6a3 3 0 0 0 6 0z',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.5 2.5l2 .5v2l-2 .5-.8 2 1 1.8-1.4 1.4-1.8-1-2 .8-.5 2h-2l-.5-2-2-.8-1.8 1-1.4-1.4 1-1.8-.8-2-2-.5v-2l2-.5.8-2-1-1.8L5.7 4.3l1.8 1 2-.8.5-2h2l.5 2 2 .8 1.8-1 1.4 1.4-1 1.8z',
  lock: 'M6 10V7a6 6 0 0 1 12 0v3h1v11H5V10zm3 0h6V7a3 3 0 0 0-6 0z',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z',
  restart: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5',
  download: 'M12 3v12M6 10l6 6 6-6M4 21h16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  volume: 'M3 9v6h4l5 4V5L7 9zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14',
  mute: 'M3 9v6h4l5 4V5L7 9zM16 9l6 6M22 9l-6 6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  magnet: 'M5 3h4v8a3 3 0 0 0 6 0V3h4v8a7 7 0 0 1-14 0z',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  database: 'M12 3c4.4 0 8 1.3 8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6c0-1.7 3.6-3 8-3zM4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
};

const STROKED = new Set(['back', 'check', 'x', 'restart', 'download', 'plus', 'trash', 'map', 'scale', 'volume', 'mute', 'flag', 'database', 'box']);

export function Icon({ name, size = 22, color = 'currentColor', style }: { name: string; size?: number; color?: string; style?: CSSProperties }) {
  const d = PATHS[name] ?? PATHS.star;
  const stroked = STROKED.has(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        d={d}
        fill={stroked ? 'none' : color}
        stroke={stroked ? color : 'none'}
        strokeWidth={stroked ? 2.4 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule="evenodd"
      />
    </svg>
  );
}

export const POWER_ICON: Record<string, string> = {
  shield: 'shield', boost: 'bolt', automation: 'gear', magnet: 'magnet', backup: 'database', oversight: 'eye',
};

export const GROUP_ICON: Record<string, string> = {
  data: 'database', ai: 'spark', automation: 'gear', privacy: 'shield', governance: 'flag',
};

/** People4good brand mark (the four faces). Text is set separately so it can be white on dark. */
export function Logo({ size = 54 }: { size?: number }) {
  return (
    <img
      className="logo-mark"
      src={`${import.meta.env.BASE_URL}assets/brand/people4good-mark.png`}
      width={size}
      height={size}
      alt="People4good"
      draggable={false}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function hex(n: number) {
  return '#' + n.toString(16).padStart(6, '0');
}
