import type React from 'react';
import { type RefObject, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

/**
 * Pan amount in pixels for keyboard navigation
 */
const PAN_AMOUNT = 100;

/**
 * Hook for keyboard-based map navigation
 *
 * Handles arrow keys for panning and +/- for zoom.
 *
 * @param mapRef Ref to the MapLibre map instance
 * @returns keyDown event handler for the map container
 */
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
          map.panBy([0, -PAN_AMOUNT], { duration: 200 });
          break;
        case 'ArrowDown':
          event.preventDefault();
          map.panBy([0, PAN_AMOUNT], { duration: 200 });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          map.panBy([-PAN_AMOUNT, 0], { duration: 200 });
          break;
        case 'ArrowRight':
          event.preventDefault();
          map.panBy([PAN_AMOUNT, 0], { duration: 200 });
          break;
        case '=':
        case '+':
          event.preventDefault();
          map.zoomIn({ duration: 200 });
          break;
        case '-':
          event.preventDefault();
          map.zoomOut({ duration: 200 });
          break;
        default:
          break;
      }
    },
    [mapRef],
  );
}
