import { useEffect, useState } from 'react';
import type { YearEntry } from '../types/year';
import { loadYearIndex } from '../utils/year-index';

interface UseYearIndexReturn {
  years: YearEntry[];
  isLoading: boolean;
}

/**
 * Hook to load the year index on mount
 *
 * Fetches available years from the index file and caches the result.
 * Returns an empty array while loading or on error.
 */
export function useYearIndex(): UseYearIndexReturn {
  const [years, setYears] = useState<YearEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const index = await loadYearIndex();
        if (isMounted) {
          setYears(index.years);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load year index:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { years, isLoading };
}
