import { Fragment, useMemo } from 'react';
import { classifyEvents } from '@/domain/territory/classify-events';
import type { KeyEvent } from '@/domain/territory/types';
import { cn } from '@/lib/utils';

export function TerritoryTimeline({
  keyEvents,
  selectedYear,
}: {
  keyEvents: KeyEvent[] | undefined;
  selectedYear: number;
}) {
  const classified = useMemo(
    () => (keyEvents ? classifyEvents(keyEvents, selectedYear) : []),
    [keyEvents, selectedYear],
  );

  if (!keyEvents || keyEvents.length === 0) return null;

  const hasCurrent = classified.some((event) => event.temporal === 'current');

  const markerIndex = hasCurrent
    ? -1
    : classified.findIndex((event) => event.temporal === 'future');

  const resolvedMarkerIndex = markerIndex === -1 && !hasCurrent ? classified.length : markerIndex;

  const yearMarker = !hasCurrent && (
    <li key="year-marker" role="none" className="py-2">
      <hr aria-label={`${selectedYear}年`} className="flex items-center gap-2 border-0" />
      <span className="flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-500" />
        <span className="shrink-0 text-xs font-medium text-gray-400">{selectedYear}年</span>
        <span className="h-px flex-1 bg-gray-500" />
      </span>
    </li>
  );

  return (
    <ol aria-label="主な出来事" className="space-y-1">
      {classified.map((event, i) => {
        const isPast = event.temporal === 'past';
        const isCurrent = event.temporal === 'current';
        const isFuture = event.temporal === 'future';

        return (
          <Fragment key={`${event.year}-${event.event}`}>
            {resolvedMarkerIndex === i && yearMarker}
            <li
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'flex items-start gap-3 py-1.5',
                isPast && 'opacity-75',
                isCurrent && 'font-semibold',
                isFuture && 'opacity-60 border-dashed',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 inline-block size-2.5 shrink-0 rounded-full',
                  isPast && 'bg-slate-400',
                  isCurrent && 'ring-2 ring-white bg-white',
                  isFuture && 'border border-dashed border-slate-400',
                )}
              />
              <span className="shrink-0 text-sm tabular-nums text-gray-300">{event.year}</span>
              <span className={cn('text-sm', isCurrent ? 'text-white' : 'text-gray-300')}>
                {event.event}
              </span>
            </li>
          </Fragment>
        );
      })}
      {resolvedMarkerIndex === classified.length && yearMarker}
    </ol>
  );
}
