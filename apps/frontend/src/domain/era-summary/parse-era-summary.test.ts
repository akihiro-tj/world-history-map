import { describe, expect, it } from 'vitest';
import { parseEraSummary } from './parse-era-summary';

const validSummary = {
  year: 1650,
  regions: [
    {
      region: 'europe',
      title: 'ヨーロッパ',
      context: 'ウェストファリア条約後の主権国家体制。',
      references: [{ kind: 'territory', target: 'France', text: 'フランス' }],
    },
  ],
};

describe('parseEraSummary', () => {
  it('returns the summary when the shape is valid', () => {
    expect(parseEraSummary(validSummary)).toEqual(validSummary);
  });

  it('returns null when the root is not an object', () => {
    expect(parseEraSummary(null)).toBeNull();
    expect(parseEraSummary([validSummary])).toBeNull();
    expect(parseEraSummary('nope')).toBeNull();
  });

  it('returns null when regions is empty or missing', () => {
    expect(parseEraSummary({ year: 1650, regions: [] })).toBeNull();
    expect(parseEraSummary({ year: 1650 })).toBeNull();
  });

  it('returns null when a region has an unknown region id', () => {
    expect(
      parseEraSummary({
        year: 1650,
        regions: [{ region: 'atlantis', title: 'A', context: 'ctx', references: [] }],
      }),
    ).toBeNull();
  });

  it('returns null when a reference has an invalid kind or empty fields', () => {
    expect(
      parseEraSummary({
        year: 1650,
        regions: [
          {
            region: 'europe',
            title: 'A',
            context: 'ctx',
            references: [{ kind: 'place', target: 'France', text: 'フランス' }],
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseEraSummary({
        year: 1650,
        regions: [
          {
            region: 'europe',
            title: 'A',
            context: 'ctx',
            references: [{ kind: 'territory', target: '', text: 'フランス' }],
          },
        ],
      }),
    ).toBeNull();
  });

  it('returns null when year is not a number', () => {
    expect(parseEraSummary({ ...validSummary, year: '1650' })).toBeNull();
  });
});
