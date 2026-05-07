import type { HistoricalYear } from '../year/historical-year';

export type RegionId =
  | 'europe'
  | 'east-asia'
  | 'southeast-asia'
  | 'south-asia'
  | 'middle-east-north-africa'
  | 'sub-saharan-africa'
  | 'americas'
  | 'oceania';

export interface EraSummaryReference {
  readonly kind: 'territory' | 'year';
  readonly target: string;
  readonly text: string;
}

export interface RegionCard {
  readonly region: RegionId;
  readonly title: string;
  readonly context: string;
  readonly references: readonly EraSummaryReference[];
}

export interface EraSummary {
  readonly year: HistoricalYear;
  readonly regions: readonly RegionCard[];
}
