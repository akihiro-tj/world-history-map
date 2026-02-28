import type { YearEntry, YearIndex } from '../types/year';

const INDEX_PATH = '/pmtiles/index.json';
const FILENAME_PATTERN = /^world_-?\d+\.pmtiles$/;

function validateYearEntry(entry: unknown): entry is YearEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;
  const year = e['year'];
  const filename = e['filename'];
  const countries = e['countries'];

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

function validateYearIndex(data: unknown): data is YearIndex {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const d = data as Record<string, unknown>;
  const years = d['years'];

  if (!Array.isArray(years)) {
    return false;
  }

  return years.every(validateYearEntry);
}

let cachedYearIndex: YearIndex | null = null;

export async function loadYearIndex(): Promise<YearIndex> {
  if (cachedYearIndex) {
    return cachedYearIndex;
  }

  const response = await fetch(INDEX_PATH);

  if (!response.ok) {
    throw new Error(`Failed to load year index: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!validateYearIndex(data)) {
    throw new Error('Invalid year index format');
  }

  cachedYearIndex = data;
  return data;
}

export function clearYearIndexCache(): void {
  cachedYearIndex = null;
}

export function getYearFilePath(yearIndex: YearIndex, year: number): string | null {
  const entry = yearIndex.years.find((e) => e.year === year);
  if (!entry) {
    return null;
  }
  return `/pmtiles/${entry.filename}`;
}

export function findNearestYear(yearIndex: YearIndex, targetYear: number): number | null {
  if (yearIndex.years.length === 0) {
    return null;
  }

  const firstEntry = yearIndex.years[0];
  if (!firstEntry) {
    return null;
  }
  let nearest = firstEntry.year;
  let minDiff = Math.abs(targetYear - nearest);

  for (const entry of yearIndex.years) {
    const diff = Math.abs(targetYear - entry.year);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = entry.year;
    }
  }

  return nearest;
}

export function getSortedYears(yearIndex: YearIndex): number[] {
  return yearIndex.years.map((e) => e.year).sort((a, b) => a - b);
}
