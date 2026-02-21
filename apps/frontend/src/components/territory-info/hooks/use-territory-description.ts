import { useEffect, useState } from 'react';
import type { TerritoryDescription, YearDescriptionBundle } from '../../../types/territory';

/**
 * Result of the useTerritoryDescription hook
 */
interface UseTerritoryDescriptionResult {
  /** Territory description data, null if not found or loading */
  description: TerritoryDescription | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message, null if no error */
  error: string | null;
}

/** Module-level cache: year → bundle of all territory descriptions for that year */
const yearCache = new Map<number, YearDescriptionBundle>();

/** In-flight fetch promises to deduplicate concurrent requests for the same year */
const pendingFetches = new Map<number, Promise<YearDescriptionBundle | null>>();

/**
 * Converts a territory name to kebab-case for bundle key lookup
 * e.g., "England and Ireland" -> "england-and-ireland"
 */
function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Fetches and caches the year description bundle.
 * Deduplicates concurrent requests for the same year.
 */
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

/**
 * Prefetch territory descriptions for a given year.
 * Call this on year selection to warm the cache before territory clicks.
 */
export function prefetchYearDescriptions(year: number): void {
  fetchYearBundle(year).catch(() => {
    // Silently ignore prefetch errors
  });
}

/**
 * Clears the year description cache (for testing purposes)
 */
export function clearDescriptionCache(): void {
  yearCache.clear();
  pendingFetches.clear();
}

/**
 * Hook to fetch and manage territory description data
 *
 * Fetches the year-level bundle and extracts the specific territory's
 * description. Uses module-level caching so subsequent lookups within
 * the same year are instant.
 *
 * @param territoryName - Name of the territory (null if none selected)
 * @param year - Year for the description
 * @returns Description data, loading state, and any error
 */
export function useTerritoryDescription(
  territoryName: string | null,
  year: number,
): UseTerritoryDescriptionResult {
  const [description, setDescription] = useState<TerritoryDescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when territory is deselected
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
