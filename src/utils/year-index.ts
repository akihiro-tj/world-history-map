import type { YearEntry, YearIndex } from '../types';

/** PMTilesインデックスファイルのパス */
const INDEX_PATH = '/pmtiles/index.json';

/** ファイル名のバリデーション用正規表現 */
const FILENAME_PATTERN = /^world_-?\d+\.pmtiles$/;

/**
 * YearEntryのバリデーション
 */
function validateYearEntry(entry: unknown): entry is YearEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;

  if (typeof e.year !== 'number' || !Number.isInteger(e.year)) {
    return false;
  }

  if (typeof e.filename !== 'string' || !FILENAME_PATTERN.test(e.filename)) {
    return false;
  }

  if (!Array.isArray(e.countries)) {
    return false;
  }

  if (!e.countries.every((c): c is string => typeof c === 'string')) {
    return false;
  }

  return true;
}

/**
 * YearIndexのバリデーション
 */
function validateYearIndex(data: unknown): data is YearIndex {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.years)) {
    return false;
  }

  return d.years.every(validateYearEntry);
}

/**
 * 年代インデックスを読み込む
 *
 * @returns 年代インデックスデータ
 * @throws インデックスの読み込みまたはバリデーションに失敗した場合
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
 * 指定した年代のPMTilesファイルパスを取得
 *
 * @param yearIndex 年代インデックス
 * @param year 対象年代
 * @returns PMTilesファイルのURL、見つからない場合はnull
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
 * 最も近い利用可能な年代を探す
 *
 * @param yearIndex 年代インデックス
 * @param targetYear 検索対象の年代
 * @returns 最も近い年代、インデックスが空の場合はnull
 *
 * @example
 * ```ts
 * const nearest = findNearestYear(yearIndex, 1655);
 * // => 1650 (1650年と1700年がある場合)
 * ```
 */
export function findNearestYear(yearIndex: YearIndex, targetYear: number): number | null {
  if (yearIndex.years.length === 0) {
    return null;
  }

  let nearest = yearIndex.years[0].year;
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
 * 年代リストを昇順でソートして取得
 *
 * @param yearIndex 年代インデックス
 * @returns ソートされた年代の配列
 */
export function getSortedYears(yearIndex: YearIndex): number[] {
  return yearIndex.years.map((e) => e.year).sort((a, b) => a - b);
}
