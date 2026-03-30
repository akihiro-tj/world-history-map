import { CachedFetcher } from '../../lib/cached-fetcher';
import type { TerritoryDescription, YearDescriptionBundle } from './types';

const yearFetchers = new Map<number, CachedFetcher<YearDescriptionBundle | null>>();

function getYearFetcher(year: number): CachedFetcher<YearDescriptionBundle | null> {
  let fetcher = yearFetchers.get(year);
  if (fetcher) return fetcher;

  fetcher = new CachedFetcher<YearDescriptionBundle | null>({
    async fetch() {
      const response = await fetch(`/data/descriptions/${year}.json`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch description bundle: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return null;

      return response.json() as Promise<YearDescriptionBundle>;
    },
  });

  yearFetchers.set(year, fetcher);
  return fetcher;
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function prefetchYearDescriptions(year: number): void {
  getYearFetcher(year)
    .load()
    .catch(() => {});
}

export function clearDescriptionCache(): void {
  yearFetchers.clear();
}

export async function loadTerritoryDescription(
  territoryName: string,
  year: number,
): Promise<TerritoryDescription | null> {
  const bundle = await getYearFetcher(year).load();

  if (!bundle) return null;

  const key = toKebabCase(territoryName);
  return bundle[key] ?? null;
}
