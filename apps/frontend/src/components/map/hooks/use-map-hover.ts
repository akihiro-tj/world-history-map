import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { TerritoryProperties } from '../../../types/territory';

export function useMapHover(): {
  isHoveringTerritory: boolean;
  handleMouseMove: (event: MapLayerMouseEvent) => void;
} {
  const [isHoveringTerritory, setIsHoveringTerritory] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    // Capture features immediately before rAF callback
    const features = event.features;
    const firstFeature = features?.[0];
    const hasClickableTerritory = !!(
      firstFeature && (firstFeature.properties as TerritoryProperties).SUBJECTO
    );

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setIsHoveringTerritory((prev) =>
        prev !== hasClickableTerritory ? hasClickableTerritory : prev,
      );
      rafRef.current = null;
    });
  }, []);

  return { isHoveringTerritory, handleMouseMove };
}
