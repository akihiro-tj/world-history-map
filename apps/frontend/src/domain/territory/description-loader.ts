import type { HistoricalYear } from '../year/historical-year';
import {
  type DescriptionBundleSource,
  HttpTerritoryDescriptionRepository,
} from './http-territory-description-repository';
import { TerritoryName } from './territory-name';
import type { TerritoryDescription, YearDescriptionBundle } from './types';

class HttpDescriptionBundleSource implements DescriptionBundleSource {
  async fetch(year: HistoricalYear): Promise<YearDescriptionBundle | null> {
    const response = await fetch(`/data/descriptions/${year}.json`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch description bundle: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) return null;

    return response.json() as Promise<YearDescriptionBundle>;
  }
}

const repository = new HttpTerritoryDescriptionRepository(new HttpDescriptionBundleSource());

export function prefetchYearDescriptions(year: HistoricalYear): void {
  repository.prefetch(year);
}

export function clearDescriptionCache(): void {
  repository.clearCache();
}

export async function loadTerritoryDescription(
  territoryName: string,
  year: HistoricalYear,
): Promise<TerritoryDescription | null> {
  return repository.load(new TerritoryName(territoryName), year);
}
