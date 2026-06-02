import type { RegionId } from './region-id.ts';

export interface EraSummaryReference {
  kind: 'territory' | 'year';
  target: string;
  text: string;
}

export interface RegionCard {
  region: RegionId;
  title: string;
  context: string;
  references: EraSummaryReference[];
}

export interface EraSummary {
  year: number;
  regions: RegionCard[];
}
