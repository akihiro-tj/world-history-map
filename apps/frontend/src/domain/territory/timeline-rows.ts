import type { HistoricalYear } from '../year/historical-year';
import { classifyEvents } from './classify-events';
import type { ClassifiedKeyEvent, KeyEvent } from './types';

export type ClassifiedTimelineRow = ClassifiedKeyEvent & { kind: 'classified' };

export type CurrentYearMarkerRow = {
  kind: 'currentYearMarker';
  year: HistoricalYear;
  temporal: 'current';
};

export type TimelineRow = ClassifiedTimelineRow | CurrentYearMarkerRow;

function toClassifiedRow(event: ClassifiedKeyEvent): ClassifiedTimelineRow {
  return { ...event, kind: 'classified' };
}

function buildRowList(events: KeyEvent[], selectedYear: HistoricalYear): TimelineRow[] {
  const marker: CurrentYearMarkerRow = {
    kind: 'currentYearMarker',
    year: selectedYear,
    temporal: 'current',
  };

  if (events.length === 0) {
    return [marker];
  }

  const classified = classifyEvents(events, selectedYear);
  const hasCurrentEvent = classified.some((event) => event.temporal === 'current');

  if (hasCurrentEvent) {
    return classified.map(toClassifiedRow);
  }

  const firstFutureIndex = classified.findIndex((event) => event.temporal === 'future');
  const pivot = firstFutureIndex === -1 ? classified.length : firstFutureIndex;

  return [
    ...classified.slice(0, pivot).map(toClassifiedRow),
    marker,
    ...classified.slice(pivot).map(toClassifiedRow),
  ];
}

export class TimelineRows {
  private readonly _rows: readonly TimelineRow[];

  private constructor(rows: readonly TimelineRow[]) {
    this._rows = rows;
  }

  static from(events: KeyEvent[] | undefined, selectedYear: HistoricalYear): TimelineRows {
    if (events === undefined) {
      return new TimelineRows([]);
    }
    return new TimelineRows(buildRowList(events, selectedYear));
  }

  rows(): readonly TimelineRow[] {
    return this._rows;
  }

  hasContent(): boolean {
    return this._rows.length > 0;
  }
}
