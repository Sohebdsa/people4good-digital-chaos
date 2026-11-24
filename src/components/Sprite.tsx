import type { CSSProperties } from 'react';
import { useApp } from '../store/appStore';

export type SpriteKind = 'items' | 'powerups' | 'obstacles' | 'scenery' | 'backgrounds' | 'character';

/** URL of a rendered sprite (see docs/art-direction-brief.md). */
export function spriteUrl(kind: SpriteKind, id: string, style = useApp.getState().settings.spriteStyle) {
  const folder = style === 'illustrated' ? '' : 'realistic/';
  return `${import.meta.env.BASE_URL}assets/sprites/${folder}${kind}/${id}.png`;
}

/**
 * Decorative sprite image. Lazy-loaded so menus only fetch what they show.
 * Meaning is always carried by adjacent text, so the image is hidden from screen readers.
 */
export function Sprite({ kind, id, size = 48, style, className }: { kind: SpriteKind; id: string; size?: number; style?: CSSProperties; className?: string }) {
  const spriteStyle = useApp((s) => s.settings.spriteStyle);
  return (
    <img
      className={`sprite ${className ?? ''}`}
      src={spriteUrl(kind, id, spriteStyle)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      style={style}
    />
  );
}
