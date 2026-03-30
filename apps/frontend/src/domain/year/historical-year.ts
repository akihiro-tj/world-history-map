export const INITIAL_YEAR = 1650;

export type HistoricalYear = number & { readonly __brand: 'HistoricalYear' };

export function createHistoricalYear(year: number): HistoricalYear {
  if (!Number.isInteger(year)) {
    throw new RangeError(`HistoricalYear must be an integer, got ${year}`);
  }
  return year as HistoricalYear;
}

export function isBCE(year: HistoricalYear): boolean {
  return year < 0;
}

export function formatHistoricalYear(year: HistoricalYear): string {
  if (year < 0) {
    return `前${Math.abs(year)}`;
  }
  return String(year);
}
