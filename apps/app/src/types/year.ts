/**
 * Year entry
 * Holds PMTiles file information for each year
 */
export interface YearEntry {
  /** Year (negative values represent BCE) */
  year: number;

  /** PMTiles filename (e.g., "world_1650.pmtiles") */
  filename: string;

  /** Array of country/territory names that existed in this era */
  countries: string[];
}

/**
 * Year index
 * List of all available years
 */
export interface YearIndex {
  years: YearEntry[];
}
