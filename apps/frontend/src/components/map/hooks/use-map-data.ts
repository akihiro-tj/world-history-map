import { useEffect, useState } from 'react';
import type { YearIndex } from '../../../types';
import { loadColorScheme } from '../../../utils/color-scheme';
import { getTilesUrl, loadTilesManifest, type TilesManifest } from '../../../utils/tiles-config';
import { loadYearIndex } from '../../../utils/year-index';

/**
 * Map data state
 */
interface MapDataState {
  /** Year index data */
  yearIndex: YearIndex | null;
  /** Tiles manifest (for hashed filenames) */
  tilesManifest: TilesManifest | null;
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
type UseMapDataReturn = MapDataState;

/**
 * Hook to manage map data loading
 *
 * Handles loading the year index and constructing PMTiles URLs
 * for the specified year.
 *
 * @param initialYear Initial year to load (default: 1650)
 * @returns Map data state
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   const { pmtilesUrl, isLoading, error } = useMapData(1650);
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
    tilesManifest: null,
    pmtilesUrl: null,
    isLoading: true,
    error: null,
  });

  // Load year index and tiles manifest on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [index, manifest] = await Promise.all([
          loadYearIndex(),
          loadTilesManifest(),
          loadColorScheme(),
        ]);
        if (!isMounted) return;

        const pmtilesUrl = getTilesUrl(initialYear, manifest);
        if (!pmtilesUrl) {
          setState({
            yearIndex: index,
            tilesManifest: manifest,
            pmtilesUrl: null,
            isLoading: false,
            error: `Year ${initialYear} not found`,
          });
          return;
        }

        setState({
          yearIndex: index,
          tilesManifest: manifest,
          pmtilesUrl,
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
