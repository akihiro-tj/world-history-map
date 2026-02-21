import { useEffect, useState } from 'react';
import type { YearIndex } from '../../../types/year';
import { loadColorScheme } from '../../../utils/color-scheme';
import { getTilesUrl, loadTilesManifest, type TilesManifest } from '../../../utils/tiles-config';
import { loadYearIndex } from '../../../utils/year-index';

interface MapDataState {
  yearIndex: YearIndex | null;
  tilesManifest: TilesManifest | null;
  pmtilesUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

type UseMapDataReturn = MapDataState;

export function useMapData(initialYear = 1650): UseMapDataReturn {
  const [state, setState] = useState<MapDataState>({
    yearIndex: null,
    tilesManifest: null,
    pmtilesUrl: null,
    isLoading: true,
    error: null,
  });

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
