import { describe, expect, it } from 'vitest';
import { classifyEvents } from './classify-events';
import type { KeyEvent } from './types';

describe('classifyEvents', () => {
  it('classifies events as past, current, or future relative to selectedYear', () => {
    const events: KeyEvent[] = [
      { year: 1643, event: 'ルイ14世即位' },
      { year: 1700, event: '選択年のイベント' },
      { year: 1789, event: 'フランス革命' },
    ];

    const result = classifyEvents(events, 1700);

    expect(result).toEqual([
      { year: 1643, event: 'ルイ14世即位', temporal: 'past' },
      { year: 1700, event: '選択年のイベント', temporal: 'current' },
      { year: 1789, event: 'フランス革命', temporal: 'future' },
    ]);
  });

  it('classifies current only on exact match', () => {
    const events: KeyEvent[] = [
      { year: 1699, event: 'one year before' },
      { year: 1700, event: 'exact match' },
      { year: 1701, event: 'one year after' },
    ];

    const result = classifyEvents(events, 1700);

    expect(result[0]?.temporal).toBe('past');
    expect(result[1]?.temporal).toBe('current');
    expect(result[2]?.temporal).toBe('future');
  });

  it('returns empty array for empty input', () => {
    expect(classifyEvents([], 1700)).toEqual([]);
  });

  it('classifies all events as past when all are before selectedYear', () => {
    const events: KeyEvent[] = [
      { year: 1600, event: 'a' },
      { year: 1650, event: 'b' },
    ];

    const result = classifyEvents(events, 1700);

    expect(result.every((e) => e.temporal === 'past')).toBe(true);
  });

  it('classifies all events as future when all are after selectedYear', () => {
    const events: KeyEvent[] = [
      { year: 1800, event: 'a' },
      { year: 1900, event: 'b' },
    ];

    const result = classifyEvents(events, 1700);

    expect(result.every((e) => e.temporal === 'future')).toBe(true);
  });

  it('handles negative years (BCE)', () => {
    const events: KeyEvent[] = [
      { year: -600, event: 'ancient event' },
      { year: -500, event: 'selected year event' },
      { year: -400, event: 'later event' },
    ];

    const result = classifyEvents(events, -500);

    expect(result[0]?.temporal).toBe('past');
    expect(result[1]?.temporal).toBe('current');
    expect(result[2]?.temporal).toBe('future');
  });
});
