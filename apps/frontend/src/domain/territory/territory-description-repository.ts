import type { HistoricalYear } from '../year/historical-year';
import type { TerritoryName } from './territory-name';
import type { TerritoryDescription } from './types';

export interface TerritoryDescriptionRepository {
  load(name: TerritoryName, year: HistoricalYear): Promise<TerritoryDescription | null>;
  prefetch(year: HistoricalYear): void;
  clearCache(): void;
}
