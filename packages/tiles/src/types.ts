declare const HistoricalYearStringBrand: unique symbol;
declare const HashedFilenameBrand: unique symbol;

export type HistoricalYearString = string & { readonly [HistoricalYearStringBrand]: true };
export type HashedFilename = string & { readonly [HashedFilenameBrand]: true };
export type Manifest = Readonly<Record<HistoricalYearString, HashedFilename>>;

export function asHistoricalYearString(value: string): HistoricalYearString {
  return value as HistoricalYearString;
}

export function asHashedFilename(value: string): HashedFilename {
  return value as HashedFilename;
}

export function historicalYearStringFrom(year: number): HistoricalYearString {
  return String(year) as HistoricalYearString;
}
