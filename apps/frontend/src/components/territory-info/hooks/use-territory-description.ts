import { useEffect, useState } from 'react';
import { loadTerritoryDescription } from '@/domain/territory/description-loader';
import type { TerritoryDescription } from '@/domain/territory/types';

interface UseTerritoryDescriptionResult {
  description: TerritoryDescription | null;
  isLoading: boolean;
  error: string | null;
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
        const entry = await loadTerritoryDescription(name, year);

        if (cancelled) return;

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
