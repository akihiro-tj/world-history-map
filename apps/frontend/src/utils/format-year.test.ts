import { describe, expect, it } from 'vitest';
import { formatYear } from './format-year';

describe('formatYear', () => {
  it('returns string representation for positive years', () => {
    expect(formatYear(1650)).toBe('1650');
    expect(formatYear(1)).toBe('1');
    expect(formatYear(2000)).toBe('2000');
  });

  it('returns BCE format for negative years', () => {
    expect(formatYear(-200)).toBe('前200');
    expect(formatYear(-1)).toBe('前1');
    expect(formatYear(-3000)).toBe('前3000');
  });

  it('returns "0" for year zero', () => {
    expect(formatYear(0)).toBe('0');
  });
});
