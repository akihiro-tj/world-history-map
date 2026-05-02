import { useMemo } from 'react';
import { classifyEvents } from '@/domain/territory/classify-events';
import type { ClassifiedKeyEvent, KeyEvent } from '@/domain/territory/types';
import type { HistoricalYear } from '@/domain/year/historical-year';
import { cn } from '@/lib/utils';

type EventRow =
  | (ClassifiedKeyEvent & { kind: 'classified' })
  | { kind: 'placeholder'; year: number; event: string; temporal: 'current' };

function buildRows(keyEvents: KeyEvent[], selectedYear: HistoricalYear): EventRow[] {
  if (keyEvents.length === 0) {
    return [{ kind: 'placeholder', year: selectedYear, event: '現在', temporal: 'current' }];
  }

  const classified = classifyEvents(keyEvents, selectedYear);
  const hasCurrent = classified.some((e) => e.temporal === 'current');

  if (hasCurrent) {
    return classified.map((e) => ({ ...e, kind: 'classified' as const }));
  }

  const rows: EventRow[] = classified.map((e) => ({ ...e, kind: 'classified' as const }));
  const insertIndex = classified.findIndex((e) => e.temporal === 'future');
  const placeholder: EventRow = {
    kind: 'placeholder',
    year: selectedYear,
    event: '現在',
    temporal: 'current',
  };
  rows.splice(insertIndex === -1 ? rows.length : insertIndex, 0, placeholder);
  return rows;
}

export function TerritoryTimeline({
  keyEvents,
  selectedYear,
}: {
  keyEvents: KeyEvent[] | undefined;
  selectedYear: HistoricalYear;
}) {
  const rows = useMemo(
    () => (keyEvents ? buildRows(keyEvents, selectedYear) : []),
    [keyEvents, selectedYear],
  );

  if (!keyEvents) return null;

  return (
    <ol aria-label="主な出来事" className="relative list-none pl-3.5">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[3px] top-2 w-px bg-surface-border"
      />
      {rows.map((row) => {
        const isCurrent = row.temporal === 'current';
        const isFuture = row.temporal === 'future';
        return (
          <li
            key={`${row.kind}-${row.year}-${row.event}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={cn(
              'relative flex items-center gap-2.5',
              isCurrent ? 'py-2 font-semibold' : 'py-1.5',
              isFuture && 'opacity-60',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute top-1/2 -translate-y-1/2 shrink-0 rounded-full',
                isCurrent
                  ? '-left-[15px] size-[9px] border-2 border-surface-panel bg-role-selected'
                  : '-left-3 size-[3px] bg-text-quiet',
              )}
              style={isCurrent ? { boxShadow: '0 0 8px var(--color-role-selected)' } : undefined}
            />
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums',
                isCurrent ? 'text-role-selected' : 'text-text-tertiary',
              )}
            >
              {row.year}
            </span>
            <span className={cn('text-sm', isCurrent ? 'text-white' : 'text-text-secondary')}>
              {row.event}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
