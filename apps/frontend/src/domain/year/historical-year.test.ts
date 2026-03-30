import { describe, expect, it } from 'vitest';
import { createHistoricalYear, formatHistoricalYear, isBCE } from './historical-year';

describe('createHistoricalYear', () => {
  it('creates a HistoricalYear from a valid integer', () => {
    const year = createHistoricalYear(1650);
    expect(year).toBe(1650);
  });

  it('accepts negative integers (BCE)', () => {
    const year = createHistoricalYear(-500);
    expect(year).toBe(-500);
  });

  it('accepts zero', () => {
    const year = createHistoricalYear(0);
    expect(year).toBe(0);
  });

  it('throws RangeError for non-integer values', () => {
    expect(() => createHistoricalYear(3.14)).toThrow(RangeError);
    expect(() => createHistoricalYear(3.14)).toThrow('HistoricalYear must be an integer');
  });

  it('throws RangeError for NaN', () => {
    expect(() => createHistoricalYear(Number.NaN)).toThrow(RangeError);
  });

  it('throws RangeError for Infinity', () => {
    expect(() => createHistoricalYear(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('isBCE', () => {
  it('returns true for negative years', () => {
    expect(isBCE(createHistoricalYear(-500))).toBe(true);
  });

  it('returns false for positive years', () => {
    expect(isBCE(createHistoricalYear(1650))).toBe(false);
  });

  it('returns false for year zero', () => {
    expect(isBCE(createHistoricalYear(0))).toBe(false);
  });
});

describe('formatHistoricalYear', () => {
  it('returns string for positive years', () => {
    expect(formatHistoricalYear(createHistoricalYear(1650))).toBe('1650');
  });

  it('returns BCE format for negative years', () => {
    expect(formatHistoricalYear(createHistoricalYear(-200))).toBe('前200');
  });

  it('returns "0" for year zero', () => {
    expect(formatHistoricalYear(createHistoricalYear(0))).toBe('0');
  });
});
