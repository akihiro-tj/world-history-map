import { type RefObject, useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { ProjectionType } from '../projection-toggle';

/**
 * Hook for managing map projection state and animated transitions
 *
 * Handles switching between mercator and globe projections with
 * appropriate flyTo animations. Skips animation on initial load.
 *
 * @param mapRef Ref to the MapLibre map instance
 * @param mapLoaded Whether the map has finished loading
 * @returns projection state and setter
 */
export function useProjection(
  mapRef: RefObject<MapRef | null>,
  mapLoaded: boolean,
): {
  projection: ProjectionType;
  setProjection: (projection: ProjectionType) => void;
} {
  const [projection, setProjection] = useState<ProjectionType>('mercator');
  const prevProjectionRef = useRef<ProjectionType | null>(null);

  useEffect(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance || !mapLoaded) return;

    const prevProjection = prevProjectionRef.current;

    // Skip animation on initial load (when there's no previous projection)
    if (prevProjection === null) {
      prevProjectionRef.current = projection;
      mapInstance.setProjection({ type: projection });
      return;
    }

    // Skip if projection hasn't changed
    if (prevProjection === projection) return;

    prevProjectionRef.current = projection;

    // Get current view state
    const currentZoom = mapInstance.getZoom();
    const currentCenter = mapInstance.getCenter();

    if (projection === 'globe') {
      // Switch to globe with dramatic zoom out
      mapInstance.setProjection({ type: 'globe' });
      mapInstance.flyTo({
        center: currentCenter,
        zoom: Math.min(currentZoom, 2),
        pitch: 0,
        bearing: 0,
        duration: 1200,
        curve: 1.8,
        essential: true,
      });
    } else {
      // Switch to mercator with zoom in
      mapInstance.flyTo({
        center: currentCenter,
        zoom: Math.max(currentZoom, 3),
        pitch: 0,
        bearing: 0,
        duration: 800,
        curve: 1.5,
        essential: true,
      });
      // Set projection during animation for smooth blend
      setTimeout(() => {
        mapInstance.setProjection({ type: 'mercator' });
      }, 200);
    }
  }, [projection, mapLoaded, mapRef]);

  return { projection, setProjection };
}
