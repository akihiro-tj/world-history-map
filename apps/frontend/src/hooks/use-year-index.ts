import { useEffect, useState } from 'react';
import type { YearEntry } from '../types/year';
import { loadYearIndex } from '../utils/year-index';

interface UseYearIndexReturn {
  years: YearEntry[];
  isLoading: boolean;
}

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
