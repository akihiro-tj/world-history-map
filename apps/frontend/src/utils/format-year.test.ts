import { describe, expect, it } from 'vitest';
import { createHistoricalYear } from '../types/historical-year';
import { formatYear } from './format-year';

describe('formatYear', () => {
  it('returns string representation for positive years', () => {
    expect(formatYear(createHistoricalYear(1650))).toBe('1650');
    expect(formatYear(createHistoricalYear(1))).toBe('1');
    expect(formatYear(createHistoricalYear(2000))).toBe('2000');
  });

  it('returns BCE format for negative years', () => {
    expect(formatYear(createHistoricalYear(-200))).toBe('前200');
    expect(formatYear(createHistoricalYear(-1))).toBe('前1');
    expect(formatYear(createHistoricalYear(-3000))).toBe('前3000');
  });

  it('returns "0" for year zero', () => {
    expect(formatYear(createHistoricalYear(0))).toBe('0');
  });
});
