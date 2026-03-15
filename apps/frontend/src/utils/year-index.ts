import type { YearEntry, YearIndex } from '../types/year';

const INDEX_PATH = '/pmtiles/index.json';
const FILENAME_PATTERN = /^world_-?\d+\.pmtiles$/;

function validateYearEntry(entry: unknown): entry is YearEntry {
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

function validateYearIndex(data: unknown): data is YearIndex {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const record = data as Record<string, unknown>;
  const years = record['years'];

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
