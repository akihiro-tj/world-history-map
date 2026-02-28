export interface YearEntry {
  year: number;
  filename: string;
  countries: string[];
}

export interface YearIndex {
  years: YearEntry[];
}
