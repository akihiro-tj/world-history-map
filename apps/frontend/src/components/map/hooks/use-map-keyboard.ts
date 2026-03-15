import type React from 'react';
import { type RefObject, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

const PAN_AMOUNT = 100;
const ANIMATION_DURATION_MS = 200;

export function useMapKeyboard(
  mapRef: RefObject<MapRef | null>,
): (event: React.KeyboardEvent<HTMLDivElement>) => void {
  return useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const map = mapRef.current;
      if (!map) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          map.panBy([0, -PAN_AMOUNT], { duration: ANIMATION_DURATION_MS });
          break;
        case 'ArrowDown':
          event.preventDefault();
          map.panBy([0, PAN_AMOUNT], { duration: ANIMATION_DURATION_MS });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          map.panBy([-PAN_AMOUNT, 0], { duration: ANIMATION_DURATION_MS });
          break;
        case 'ArrowRight':
          event.preventDefault();
          map.panBy([PAN_AMOUNT, 0], { duration: ANIMATION_DURATION_MS });
          break;
        case '=':
        case '+':
          event.preventDefault();
          map.zoomIn({ duration: ANIMATION_DURATION_MS });
          break;
        case '-':
          event.preventDefault();
          map.zoomOut({ duration: ANIMATION_DURATION_MS });
          break;
        default:
          break;
      }
    },
    [mapRef],
  );
}
