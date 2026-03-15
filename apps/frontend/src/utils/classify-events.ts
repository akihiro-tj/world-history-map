import type { ClassifiedKeyEvent, KeyEvent, KeyEventTemporal } from '../types/territory';

export function classifyEvents(events: KeyEvent[], selectedYear: number): ClassifiedKeyEvent[] {
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
