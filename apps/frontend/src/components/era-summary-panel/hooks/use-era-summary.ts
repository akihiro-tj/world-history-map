import { useEffect, useState } from 'react';
import { loadEraSummary } from '@/domain/era-summary/load';
import type { EraSummary } from '@/domain/era-summary/types';
import type { HistoricalYear } from '@/domain/year/historical-year';

interface UseEraSummaryResult {
  summary: EraSummary | null;
  isLoading: boolean;
  error: string | null;
}

export function useEraSummary(year: HistoricalYear): UseEraSummaryResult {
  const [summary, setSummary] = useState<EraSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadEraSummary(year);

        if (cancelled) return;

        setSummary(data);
      } catch (err) {
        if (cancelled) return;

        console.error('Error fetching era summary:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSummary(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [year]);

  return { summary, isLoading, error };
}
