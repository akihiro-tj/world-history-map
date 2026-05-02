import { useMemo } from 'react';
import { TimelineRows } from '@/domain/territory/timeline-rows';
import type { KeyEvent } from '@/domain/territory/types';
import type { HistoricalYear } from '@/domain/year/historical-year';
import { CURRENT_YEAR_LABEL, timelineRowStyleFor } from './timeline-row-style';

export function TerritoryTimeline({
  keyEvents,
  selectedYear,
}: {
  keyEvents: KeyEvent[] | undefined;
  selectedYear: HistoricalYear;
}) {
  const timelineRows = useMemo(
    () => TimelineRows.from(keyEvents, selectedYear),
    [keyEvents, selectedYear],
  );

  if (!timelineRows.hasContent()) return null;

  return (
    <ol aria-label="主な出来事" className="relative list-none pl-3.5">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[3px] top-2 w-px bg-surface-border"
      />
      {timelineRows.rows().map((row) => {
        const style = timelineRowStyleFor(row.temporal);
        const eventLabel = row.kind === 'classified' ? row.event : CURRENT_YEAR_LABEL;
        const isCurrent = row.temporal === 'current';
        return (
          <li
            key={`${row.kind}-${row.year}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={style.rowClassName}
          >
            <span aria-hidden className={style.markerClassName} style={style.markerInlineStyle} />
            <span className={style.yearClassName}>{row.year}</span>
            <span className={style.eventClassName}>{eventLabel}</span>
          </li>
        );
      })}
    </ol>
  );
}
