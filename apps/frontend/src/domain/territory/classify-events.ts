import type { HistoricalYear } from '../year/historical-year';
import type { ClassifiedKeyEvent, KeyEvent, KeyEventTemporal } from './types';

export function classifyEvents(
  events: KeyEvent[],
  selectedYear: HistoricalYear,
): ClassifiedKeyEvent[] {
  return events.map((event) => {
    let temporal: KeyEventTemporal;
    if (event.year < selectedYear) {
      temporal = 'past';
    } else if (event.year === selectedYear) {
      temporal = 'current';
    } else {
      temporal = 'future';
    }
    return { ...event, temporal };
  });
}
