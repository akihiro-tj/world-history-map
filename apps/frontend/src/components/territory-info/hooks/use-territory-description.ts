import { useEffect, useState } from 'react';
import { CachedFetcher } from '../../../lib/cached-fetcher';
import type { HistoricalYear } from '../../../types/historical-year';
import type { TerritoryDescription, YearDescriptionBundle } from '../../../types/territory';

interface UseTerritoryDescriptionResult {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
}

const yearFetchers = new Map<HistoricalYear, CachedFetcher<YearDescriptionBundle | null>>();

function getYearFetcher(year: HistoricalYear): CachedFetcher<YearDescriptionBundle | null> {
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

export function prefetchYearDescriptions(year: HistoricalYear): void {
  getYearFetcher(year)
    .load()
    .catch(() => {});
}

export function clearDescriptionCache(): void {
  yearFetchers.clear();
}

export function useTerritoryDescription(
  territoryName: string | null,
  year: HistoricalYear,
): UseTerritoryDescriptionResult {
  const [description, setDescription] = useState<TerritoryDescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!territoryName) {
      setDescription(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchDescription(name: string) {
      setIsLoading(true);
      setError(null);

      try {
        const bundle = await getYearFetcher(year).load();

        if (cancelled) return;

        if (!bundle) {
          setDescription(null);
          setIsLoading(false);
          return;
        }

        const key = toKebabCase(name);
        const entry = bundle[key] ?? null;
        setDescription(entry);
      } catch (err) {
        if (cancelled) return;

        console.error('Error fetching territory description:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setDescription(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDescription(territoryName);

    return () => {
      cancelled = true;
    };
  }, [territoryName, year]);

  return { description, isLoading, error };
}
