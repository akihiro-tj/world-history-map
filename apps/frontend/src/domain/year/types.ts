import type { HistoricalYear } from './historical-year';

export interface YearEntry {
  year: HistoricalYear;
  filename: string;
  countries: string[];
}

export interface YearIndex {
  years: YearEntry[];
}
