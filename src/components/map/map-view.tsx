import 'maplibre-gl/dist/maplibre-gl.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import MapGL, { Source } from 'react-map-gl/maplibre';
import { useAppState } from '../../contexts/app-state-context';
import { useMapData } from '../../hooks/use-map-data';
import { usePMTilesProtocol } from '../../hooks/use-pmtiles-protocol';
import { MAP_CONFIG } from '../../styles/map-style';
import { TerritoryLabel } from './territory-label';
import { TerritoryLayer } from './territory-layer';

/**
 * Source and layer constants
 */
const SOURCE_ID = 'territories';
const SOURCE_LAYER_TERRITORIES = 'territories';
const SOURCE_LAYER_LABELS = 'labels';

/**
 * Pan amount in pixels for keyboard navigation
 */
const PAN_AMOUNT = 100;

/**
 * MapView component
 *
 * Main map display component that renders the historical world map
 * with territory boundaries, colors, and labels.
 *
 * Features:
 * - Displays territories from PMTiles for the selected year
 * - Supports zoom/pan via mouse and keyboard
 * - Color-codes territories by SUBJECTO property
 * - Shows territory name labels
 *
 * @example
 * ```tsx
 * <AppStateProvider>
 *   <MapView />
 * </AppStateProvider>
 * ```
 */
export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const { state, actions } = useAppState();
  const { pmtilesUrl, isLoading, error } = useMapData(state.selectedYear);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Register PMTiles protocol
  usePMTilesProtocol();

  // Expose map ref to window for E2E tests
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      (window as unknown as { __mapRef: MapRef | null }).__mapRef = map;
    }
    return () => {
      (window as unknown as { __mapRef: MapRef | null }).__mapRef = null;
    };
  });

  // Handle map load
  const handleLoad = useCallback(() => {
    setMapLoaded(true);
    actions.setLoading(false);
  }, [actions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
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
  }, []);

  // Memoize map style to prevent unnecessary re-renders
  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      name: 'World History Map',
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background' as const,
          paint: {
            'background-color': '#b3d1ff',
          },
        },
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    }),
    [],
  );

  if (error) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center bg-red-50"
        data-testid="map-error"
      >
        <div className="text-center">
          <p className="text-lg text-red-600">Failed to load map data</p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-full"
      data-testid="map-container"
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Interactive historical map showing territories from the selected year. Use arrow keys to pan and +/- to zoom."
      tabIndex={0}
    >
      {/* Year indicator */}
      <div
        className="pointer-events-none absolute left-4 top-4 z-10 rounded bg-white/90 px-3 py-1 shadow"
        data-testid="current-year"
        aria-live="polite"
      >
        <span className="text-2xl font-bold tabular-nums">{state.selectedYear}</span>
        <span className="ml-1 text-sm text-gray-600">年</span>
      </div>

      {/* Loading overlay */}
      {(isLoading || !mapLoaded) && (
        <output
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ backgroundColor: '#b3d1ff' }}
          data-testid="loading-overlay"
          aria-label="Loading map data"
        >
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <span className="mt-4 text-gray-700">Loading map...</span>
          </div>
        </output>
      )}

      {/* Map */}
      {pmtilesUrl && (
        <MapGL
          ref={mapRef}
          initialViewState={{
            longitude: state.mapView.longitude,
            latitude: state.mapView.latitude,
            zoom: state.mapView.zoom,
          }}
          minZoom={MAP_CONFIG.minZoom}
          maxZoom={MAP_CONFIG.maxZoom}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          onLoad={handleLoad}
          attributionControl={false}
        >
          <Source id={SOURCE_ID} type="vector" url={pmtilesUrl}>
            <TerritoryLayer sourceId={SOURCE_ID} sourceLayer={SOURCE_LAYER_TERRITORIES} />
            <TerritoryLabel sourceId={SOURCE_ID} sourceLayer={SOURCE_LAYER_LABELS} />
          </Source>
        </MapGL>
      )}
    </div>
  );
}
