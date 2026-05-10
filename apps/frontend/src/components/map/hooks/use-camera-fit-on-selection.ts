import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { useAppState } from '@/contexts/app-state-context';
import { parseFeatureBounds } from '@/domain/territory/territory-bounds';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { MAP_CONFIG } from '@/styles/map-style';
import { usePanelPadding } from './use-panel-padding';

const SOURCE_ID = 'territories';
const SOURCE_LAYER = 'territories';
const ANIMATION_DURATION_MS = 600;

export function useCameraFitOnSelection(mapRef: RefObject<MapRef | null>): void {
  const { state } = useAppState();
  const padding = usePanelPadding();
  const prefersReducedMotion = usePrefersReducedMotion();

  const paddingRef = useRef(padding);
  paddingRef.current = padding;

  const reducedMotionRef = useRef(prefersReducedMotion);
  reducedMotionRef.current = prefersReducedMotion;

  const selectedTerritory =
    state.activePanel.kind === 'territory' ? state.activePanel.selectedTerritory : null;
  const selectedYear = state.selectedYear;

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedYear triggers re-fit when year changes for same territory (FR-009); mapRef is a stable ref
  useEffect(() => {
    if (selectedTerritory === null) return;

    const rawMap = mapRef.current?.getMap();
    if (!rawMap) return;
    const map = rawMap;

    const duration = reducedMotionRef.current ? 0 : ANIMATION_DURATION_MS;

    function tryFit(): boolean {
      const features = map.querySourceFeatures(SOURCE_ID, {
        sourceLayer: SOURCE_LAYER,
        filter: ['==', ['get', 'NAME'], selectedTerritory],
      });

      const feature = features[0];
      if (!feature) return false;

      const bounds = parseFeatureBounds(feature.properties ?? {});
      if (!bounds) return false;

      map.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: paddingRef.current, maxZoom: MAP_CONFIG.maxFitZoom, duration },
      );
      return true;
    }

    if (tryFit()) return;

    function handleSourceData(e: { isSourceLoaded: boolean }) {
      if (!e.isSourceLoaded) return;
      map.off('sourcedata', handleSourceData);
      tryFit();
    }

    map.on('sourcedata', handleSourceData);
    return () => {
      map.off('sourcedata', handleSourceData);
    };
  }, [selectedTerritory, selectedYear]);
}
