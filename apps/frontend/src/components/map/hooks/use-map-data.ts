import { useEffect, useState } from 'react';
import { MAP_CONFIG } from '../../../styles/map-style';
import { createHistoricalYear, type HistoricalYear } from '../../../types/historical-year';
import type { YearIndex } from '../../../types/year';
import { loadYearIndex } from '../../../utils/year-index';
import { loadColorScheme } from '../color-scheme';
import { getTilesUrl, loadTilesManifest, type TilesManifest } from '../tiles-config';

interface MapDataState {
  yearIndex: YearIndex | null;
  tilesManifest: TilesManifest | null;
  pmtilesUrl: string | null;
  colorScheme: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
}

type UseMapDataReturn = MapDataState;

export function useMapData(
  initialYear: HistoricalYear = createHistoricalYear(MAP_CONFIG.initialYear),
): UseMapDataReturn {
  const [state, setState] = useState<MapDataState>({
    yearIndex: null,
    tilesManifest: null,
    pmtilesUrl: null,
    colorScheme: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [index, manifest, colors] = await Promise.all([
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
            colorScheme: colors,
            isLoading: false,
            error: `Year ${initialYear} not found`,
          });
          return;
        }

        setState({
          yearIndex: index,
          tilesManifest: manifest,
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
