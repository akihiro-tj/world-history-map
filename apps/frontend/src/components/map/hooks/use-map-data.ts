import { useEffect, useState } from 'react';
import {
  createHistoricalYear,
  type HistoricalYear,
  INITIAL_YEAR,
} from '@/domain/year/historical-year';
import { loadYearIndex } from '@/domain/year/loader';
import type { YearIndex } from '@/domain/year/types';
import { loadColorScheme } from '../color-scheme';
import { getTilesUrl } from '../tiles-config';

interface MapDataState {
  yearIndex: YearIndex | null;
  pmtilesUrl: string | null;
  colorScheme: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
}

export function useMapData(
  initialYear: HistoricalYear = createHistoricalYear(INITIAL_YEAR),
): MapDataState {
  const [state, setState] = useState<MapDataState>({
    yearIndex: null,
    pmtilesUrl: null,
    colorScheme: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [index, colors] = await Promise.all([loadYearIndex(), loadColorScheme()]);
        if (!isMounted) return;

        const pmtilesUrl = getTilesUrl(initialYear);
        if (!pmtilesUrl) {
          setState({
            yearIndex: index,
            pmtilesUrl: null,
            colorScheme: colors,
            isLoading: false,
            error: `Year ${initialYear} not found`,
          });
          return;
        }

        setState({
          yearIndex: index,
          pmtilesUrl,
          colorScheme: colors,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load data',
        }));
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [initialYear]);

  return state;
}
