import { describe, expect, it } from 'vitest';
import { createHistoricalYear } from '../year/historical-year';
import { TimelineRows } from './timeline-rows';
import type { KeyEvent } from './types';

describe('TimelineRows', () => {
  const year1700 = createHistoricalYear(1700);

  it('returns empty rows with hasContent=false when events is undefined', () => {
    const rows = TimelineRows.from(undefined, year1700);
    expect(rows.hasContent()).toBe(false);
    expect(rows.rows()).toHaveLength(0);
  });

  it('returns only a current-year marker when events is empty', () => {
    const rows = TimelineRows.from([], year1700);
    expect(rows.hasContent()).toBe(true);
    expect(rows.rows()).toHaveLength(1);
    expect(rows.rows()[0]).toMatchObject({
      kind: 'currentYearMarker',
      year: year1700,
      temporal: 'current',
    });
  });

  it('places marker last when all events are past', () => {
    const events: KeyEvent[] = [
      { year: 1600, event: '過去A' },
      { year: 1650, event: '過去B' },
    ];
    const rowList = TimelineRows.from(events, year1700).rows();
    const lastRow = rowList[rowList.length - 1];
    expect(lastRow).toMatchObject({ kind: 'currentYearMarker', temporal: 'current' });
  });

  it('places marker first when all events are future', () => {
    const events: KeyEvent[] = [
      { year: 1800, event: '未来A' },
      { year: 1900, event: '未来B' },
    ];
    const rowList = TimelineRows.from(events, year1700).rows();
    const firstRow = rowList[0];
    expect(firstRow).toMatchObject({ kind: 'currentYearMarker', temporal: 'current' });
  });

  it('places marker between past and future events', () => {
    const events: KeyEvent[] = [
      { year: 1650, event: '過去' },
      { year: 1800, event: '未来' },
    ];
    const rowList = TimelineRows.from(events, year1700).rows();
    expect(rowList).toHaveLength(3);
    expect(rowList[0]).toMatchObject({ kind: 'classified', temporal: 'past' });
    expect(rowList[1]).toMatchObject({ kind: 'currentYearMarker', temporal: 'current' });
    expect(rowList[2]).toMatchObject({ kind: 'classified', temporal: 'future' });
  });

  it('does not insert a marker when an event falls exactly on the selected year', () => {
    const events: KeyEvent[] = [
      { year: 1650, event: '過去' },
      { year: 1700, event: '現在のイベント' },
      { year: 1800, event: '未来' },
    ];
    const rowList = TimelineRows.from(events, year1700).rows();
    expect(rowList).toHaveLength(3);
    expect(rowList.every((row) => row.kind === 'classified')).toBe(true);
    const currentRow = rowList.find((row) => row.temporal === 'current');
    expect(currentRow).toMatchObject({ kind: 'classified', temporal: 'current' });
  });
});
