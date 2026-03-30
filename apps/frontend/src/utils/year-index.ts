import { CachedFetcher } from '../lib/cached-fetcher';
import { createHistoricalYear } from '../types/historical-year';
import type { YearEntry, YearIndex } from '../types/year';

const INDEX_PATH = '/pmtiles/index.json';
const FILENAME_PATTERN = /^world_-?\d+\.pmtiles$/;

function isValidYearEntryShape(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const record = entry as Record<string, unknown>;
  const year = record['year'];
  const filename = record['filename'];
  const countries = record['countries'];

  if (typeof year !== 'number' || !Number.isInteger(year)) {
    return false;
  }

  if (typeof filename !== 'string' || !FILENAME_PATTERN.test(filename)) {
    return false;
  }

  if (!Array.isArray(countries)) {
    return false;
  }

  if (!countries.every((c): c is string => typeof c === 'string')) {
    return false;
  }

  return true;
}

function toYearEntry(raw: Record<string, unknown>): YearEntry {
  return {
    year: createHistoricalYear(raw['year'] as number),
    filename: raw['filename'] as string,
    countries: raw['countries'] as string[],
  };
}

function validateAndTransformYearIndex(data: unknown): YearIndex | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const years = record['years'];

  if (!Array.isArray(years)) {
    return null;
  }

  if (!years.every(isValidYearEntryShape)) {
    return null;
  }

  return {
    years: years.map((entry) => toYearEntry(entry as Record<string, unknown>)),
  };
}

const yearIndexFetcher = new CachedFetcher<YearIndex>({
  async fetch() {
    const response = await fetch(INDEX_PATH);

    if (!response.ok) {
      throw new Error(`Failed to load year index: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();
    const result = validateAndTransformYearIndex(data);
    if (!result) {
      throw new Error('Invalid year index format');
    }
    return result;
  },
});

export async function loadYearIndex(): Promise<YearIndex> {
  return yearIndexFetcher.load();
}

export function clearYearIndexCache(): void {
  yearIndexFetcher.clear();
}
