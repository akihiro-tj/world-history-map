import { type RefObject, useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { useProjectionContext } from '../../../contexts/projection-context';
import type { ProjectionType } from '../projection-toggle';

const GLOBE_MAX_ZOOM = 2;
const GLOBE_FLY_DURATION_MS = 1200;
const GLOBE_FLY_CURVE = 1.8;
const MERCATOR_MIN_ZOOM = 3;
const MERCATOR_FLY_DURATION_MS = 800;
const MERCATOR_FLY_CURVE = 1.5;
const PROJECTION_SWITCH_DELAY_MS = 200;

export function useProjection(mapRef: RefObject<MapRef | null>, mapLoaded: boolean): void {
  const { projection } = useProjectionContext();
  const prevProjectionRef = useRef<ProjectionType | null>(null);

  useEffect(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance || !mapLoaded) return;

    const prevProjection = prevProjectionRef.current;

    if (prevProjection === null) {
      prevProjectionRef.current = projection;
      mapInstance.setProjection({ type: projection });
      return;
    }

    if (prevProjection === projection) return;

    prevProjectionRef.current = projection;

    const currentZoom = mapInstance.getZoom();
    const currentCenter = mapInstance.getCenter();

    if (projection === 'globe') {
      mapInstance.setProjection({ type: 'globe' });
      mapInstance.flyTo({
        center: currentCenter,
        zoom: Math.min(currentZoom, GLOBE_MAX_ZOOM),
        pitch: 0,
        bearing: 0,
        duration: GLOBE_FLY_DURATION_MS,
        curve: GLOBE_FLY_CURVE,
        essential: true,
      });
    } else {
      mapInstance.flyTo({
        center: currentCenter,
        zoom: Math.max(currentZoom, MERCATOR_MIN_ZOOM),
        pitch: 0,
        bearing: 0,
        duration: MERCATOR_FLY_DURATION_MS,
        curve: MERCATOR_FLY_CURVE,
        essential: true,
      });
      setTimeout(() => {
        mapInstance.setProjection({ type: 'mercator' });
      }, PROJECTION_SWITCH_DELAY_MS);
    }
  }, [projection, mapLoaded, mapRef]);
}
