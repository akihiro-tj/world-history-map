import type { CSSProperties } from 'react';
import type { KeyEventTemporal } from '@/domain/territory/types';

// Numeric constants for inline styles and documentation of spatial relationships.
// Do NOT use these in Tailwind class strings (static analysis would fail).
export const TIMELINE_CURRENT_DOT_GLOW_PX = 8;

export const CURRENT_YEAR_LABEL = '現在';

export interface TimelineRowStyle {
  readonly rowClassName: string;
  readonly markerClassName: string;
  readonly markerInlineStyle: CSSProperties | undefined;
  readonly yearClassName: string;
  readonly eventClassName: string;
}

// Current dot: 9px diameter, centered on the 3px-wide rail with a 2px border
// → offset left = rail_left(3) + dot_radius(4.5) + border(2) ≈ 9.5 → 15px
const PAST_ROW_STYLE: TimelineRowStyle = {
  rowClassName: 'relative flex items-center gap-2.5 py-1.5 opacity-70',
  markerClassName:
    'absolute top-1/2 -translate-y-1/2 shrink-0 rounded-full -left-3 size-[3px] bg-text-quiet',
  markerInlineStyle: undefined,
  yearClassName: 'shrink-0 text-xs tabular-nums text-text-tertiary',
  eventClassName: 'text-sm text-text-secondary',
};

const CURRENT_ROW_STYLE: TimelineRowStyle = {
  rowClassName: 'relative flex items-center gap-2.5 py-2 font-semibold',
  markerClassName:
    'absolute top-1/2 -translate-y-1/2 shrink-0 rounded-full -left-[15px] size-[9px] border-2 border-surface-panel bg-role-selected',
  markerInlineStyle: {
    boxShadow: `0 0 ${TIMELINE_CURRENT_DOT_GLOW_PX}px var(--color-role-selected)`,
  },
  yearClassName: 'shrink-0 text-xs tabular-nums text-role-selected',
  eventClassName: 'text-sm text-white',
};

const FUTURE_ROW_STYLE: TimelineRowStyle = {
  rowClassName: 'relative flex items-center gap-2.5 py-1.5 opacity-60',
  markerClassName:
    'absolute top-1/2 -translate-y-1/2 shrink-0 rounded-full -left-3 size-[3px] bg-text-quiet',
  markerInlineStyle: undefined,
  yearClassName: 'shrink-0 text-xs tabular-nums text-text-tertiary',
  eventClassName: 'text-sm text-text-secondary',
};

const ROW_STYLES: Record<KeyEventTemporal, TimelineRowStyle> = {
  past: PAST_ROW_STYLE,
  current: CURRENT_ROW_STYLE,
  future: FUTURE_ROW_STYLE,
};

export function timelineRowStyleFor(temporal: KeyEventTemporal): TimelineRowStyle {
  return ROW_STYLES[temporal];
}
