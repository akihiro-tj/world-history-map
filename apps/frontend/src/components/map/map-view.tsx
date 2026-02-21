import 'maplibre-gl/dist/maplibre-gl.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import MapGL, { Source } from 'react-map-gl/maplibre';
import { useAppState } from '../../contexts/app-state-context';
import { MAP_CONFIG } from '../../styles/map-style';
import type { TerritoryProperties } from '../../types/territory';
import { useMapData } from './hooks/use-map-data';
import { useMapHover } from './hooks/use-map-hover';
import { useMapKeyboard } from './hooks/use-map-keyboard';
import { usePMTilesProtocol } from './hooks/use-pmtiles-protocol';
import { useProjection } from './hooks/use-projection';
import { ProjectionToggle } from './projection-toggle';
import { TerritoryLabel } from './territory-label';
import { TERRITORY_LAYER_IDS, TerritoryLayer } from './territory-layer';

/**
 * Source and layer constants
 */
const SOURCE_ID = 'territories';
const SOURCE_LAYER_TERRITORIES = 'territories';
const SOURCE_LAYER_LABELS = 'labels';

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
  const { isHoveringTerritory, handleMouseMove } = useMapHover();
  const { projection, setProjection } = useProjection(mapRef, mapLoaded);

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
  }, []);

  // Handle territory click
  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;
      if (!features || features.length === 0) {
        // Clicked on empty area - close panel
        actions.setInfoPanelOpen(false);
        actions.setSelectedTerritory(null);
        return;
      }

      // Get the first feature (topmost territory)
      const feature = features[0];
      if (!feature) return;
      const properties = feature.properties as TerritoryProperties;

      // Get territory name - prefer NAME for the clicked territory, fallback to SUBJECTO
      const territoryName = properties.NAME || properties.SUBJECTO;

      if (territoryName) {
        actions.setSelectedTerritory(territoryName);
        actions.setInfoPanelOpen(true);
      }
    },
    [actions],
  );

  // Handle keyboard navigation
  const handleKeyDown = useMapKeyboard(mapRef);

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
            'background-color': '#1a2a3a',
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
        className="flex h-screen w-full items-center justify-center bg-gray-900"
        data-testid="map-error"
      >
        <div className="text-center">
          <p className="text-lg text-red-400">Failed to load map data</p>
          <p className="text-sm text-red-300">{error}</p>
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
      {/* Loading overlay */}
      {(isLoading || !mapLoaded) && (
        <output
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ backgroundColor: '#1a2a3a' }}
          data-testid="loading-overlay"
          aria-label="Loading map data"
        >
          <div className="flex flex-col items-center">
            {/* Rotating globe */}
            <div className="relative h-16 w-16">
              <svg
                className="h-16 w-16 animate-spin text-blue-400"
                style={{ animationDuration: '3s' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" opacity="0.3" />
                <circle cx="12" cy="12" r="10" strokeDasharray="40 20" />
                <ellipse cx="12" cy="12" rx="4" ry="10" opacity="0.5" />
                <ellipse cx="12" cy="12" rx="10" ry="4" opacity="0.5" />
              </svg>
            </div>
            <span className="mt-5 text-sm tracking-wider text-gray-400">Loading...</span>
          </div>
        </output>
      )}

      {/* Projection toggle */}
      <ProjectionToggle
        projection={projection}
        onToggle={setProjection}
        className="absolute right-4 top-4 z-10"
        data-testid="projection-toggle"
      />

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
          style={{ width: '100%', height: '100%', background: '#000' }}
          mapStyle={mapStyle}
          onLoad={handleLoad}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          interactiveLayerIds={[TERRITORY_LAYER_IDS.fill]}
          attributionControl={false}
          cursor={isHoveringTerritory ? 'pointer' : 'grab'}
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
