import { useEffect, useState } from 'react';
import type { TerritoryDescription, YearDescriptionBundle } from '../../../types/territory';

interface UseTerritoryDescriptionResult {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
}

const yearCache = new Map<number, YearDescriptionBundle>();
const pendingFetches = new Map<number, Promise<YearDescriptionBundle | null>>();

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function fetchYearBundle(year: number): Promise<YearDescriptionBundle | null> {
  const cached = yearCache.get(year);
  if (cached) return cached;

  const pending = pendingFetches.get(year);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(`/data/descriptions/${year}.json`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch description bundle: ${response.status}`);
      }

      // Check content-type to ensure we got JSON (Vite dev server returns HTML for 404s as SPA fallback)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return null;

      const data: YearDescriptionBundle = await response.json();
      yearCache.set(year, data);
      return data;
    } finally {
      pendingFetches.delete(year);
    }
  })();

  pendingFetches.set(year, promise);
  return promise;
}

export function prefetchYearDescriptions(year: number): void {
  fetchYearBundle(year).catch(() => {});
}

export function clearDescriptionCache(): void {
  yearCache.clear();
  pendingFetches.clear();
}

export function useTerritoryDescription(
  territoryName: string | null,
  year: number,
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
        const bundle = await fetchYearBundle(year);

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
