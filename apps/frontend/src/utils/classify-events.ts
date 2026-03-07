import type { ClassifiedKeyEvent, KeyEvent, KeyEventTemporal } from '../types/territory';

export function classifyEvents(
  events: KeyEvent[],
  selectedYear: number,
): ClassifiedKeyEvent[] {
  return events.map((e) => {
    let temporal: KeyEventTemporal;
    if (e.year < selectedYear) {
      temporal = 'past';
    } else if (e.year === selectedYear) {
      temporal = 'current';
    } else {
      temporal = 'future';
    }
    return { ...e, temporal };
  });
}
