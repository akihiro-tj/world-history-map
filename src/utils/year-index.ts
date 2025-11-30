import type { YearEntry, YearIndex } from '../types';

/** Path to PMTiles index file */
const INDEX_PATH = '/pmtiles/index.json';

/** Regular expression for filename validation */
const FILENAME_PATTERN = /^world_-?\d+\.pmtiles$/;

/**
 * Validate YearEntry
 */
function validateYearEntry(entry: unknown): entry is YearEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;
  const year = e.year;
  const filename = e.filename;
  const countries = e.countries;

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

/**
 * Validate YearIndex
 */
function validateYearIndex(data: unknown): data is YearIndex {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const d = data as Record<string, unknown>;
  const years = d.years;

  if (!Array.isArray(years)) {
    return false;
  }

  return years.every(validateYearEntry);
}

/**
 * Load year index
 *
 * @returns Year index data
 * @throws When loading or validation fails
 *
 * @example
 * ```ts
 * const { years } = await loadYearIndex();
 * console.log(years[0].year); // 1650
 * ```
 */
export async function loadYearIndex(): Promise<YearIndex> {
  const response = await fetch(INDEX_PATH);

  if (!response.ok) {
    throw new Error(`Failed to load year index: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!validateYearIndex(data)) {
    throw new Error('Invalid year index format');
  }

  return data;
}

/**
 * Get PMTiles file path for a specified year
 *
 * @param yearIndex Year index
 * @param year Target year
 * @returns PMTiles file URL, or null if not found
 *
 * @example
 * ```ts
 * const path = getYearFilePath(yearIndex, 1650);
 * // => "/pmtiles/world_1650.pmtiles"
 * ```
 */
export function getYearFilePath(yearIndex: YearIndex, year: number): string | null {
  const entry = yearIndex.years.find((e) => e.year === year);
  if (!entry) {
    return null;
  }
  return `/pmtiles/${entry.filename}`;
}

/**
 * Find the nearest available year
 *
 * @param yearIndex Year index
 * @param targetYear Year to search for
 * @returns Nearest year, or null if index is empty
 *
 * @example
 * ```ts
 * const nearest = findNearestYear(yearIndex, 1655);
 * // => 1650 (when 1650 and 1700 are available)
 * ```
 */
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

/**
 * Get sorted year list in ascending order
 *
 * @param yearIndex Year index
 * @returns Sorted array of years
 */
export function getSortedYears(yearIndex: YearIndex): number[] {
  return yearIndex.years.map((e) => e.year).sort((a, b) => a - b);
}
