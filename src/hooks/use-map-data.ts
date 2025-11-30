import { useCallback, useEffect, useState } from 'react';
import type { YearIndex } from '../types';
import { getYearFilePath, loadYearIndex } from '../utils/year-index';

/**
 * Map data state
 */
interface MapDataState {
  /** Year index data */
  yearIndex: YearIndex | null;
  /** Current PMTiles URL */
  pmtilesUrl: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Map data hook return type
 */
interface UseMapDataReturn extends MapDataState {
  /** Load data for a specific year */
  loadYear: (year: number) => void;
}

/**
 * Hook to manage map data loading
 *
 * Handles loading the year index and constructing PMTiles URLs
 * for the specified year.
 *
 * @param initialYear Initial year to load (default: 1650)
 * @returns Map data state and load function
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   const { pmtilesUrl, isLoading, error, loadYear } = useMapData(1650);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <Error message={error} />;
 *
 *   return <Map pmtilesUrl={pmtilesUrl} />;
 * }
 * ```
 */
export function useMapData(initialYear = 1650): UseMapDataReturn {
  const [state, setState] = useState<MapDataState>({
    yearIndex: null,
    pmtilesUrl: null,
    isLoading: true,
    error: null,
  });

  // Load year index on mount
  useEffect(() => {
    let isMounted = true;

    async function loadIndex() {
      try {
        const index = await loadYearIndex();
        if (!isMounted) return;

        const filePath = getYearFilePath(index, initialYear);
        if (!filePath) {
          setState({
            yearIndex: index,
            pmtilesUrl: null,
            isLoading: false,
            error: `Year ${initialYear} not found in index`,
          });
          return;
        }

        setState({
          yearIndex: index,
          pmtilesUrl: `pmtiles://${filePath}`,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load year index',
        }));
      }
    }

    loadIndex();

    return () => {
      isMounted = false;
    };
  }, [initialYear]);

  const loadYear = useCallback(
    (year: number) => {
      if (!state.yearIndex) {
        setState((prev) => ({
          ...prev,
          error: 'Year index not loaded',
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const filePath = getYearFilePath(state.yearIndex, year);
      if (!filePath) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `Year ${year} not found in index`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        pmtilesUrl: `pmtiles://${filePath}`,
        isLoading: false,
        error: null,
      }));
    },
    [state.yearIndex],
  );

  return {
    ...state,
    loadYear,
  };
}
