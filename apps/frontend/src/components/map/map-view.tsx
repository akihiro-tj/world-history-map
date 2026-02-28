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
import type { ProjectionType } from './projection-toggle';
import { TerritoryHighlightLayer } from './territory-highlight-layer';
import { TerritoryLabel } from './territory-label';
import { TERRITORY_LAYER_IDS, TerritoryLayer } from './territory-layer';

export type { ProjectionType } from './projection-toggle';

const SOURCE_ID = 'territories';
const SOURCE_LAYER_TERRITORIES = 'territories';
const SOURCE_LAYER_LABELS = 'labels';

interface MapViewProps {
  onProjectionReady?: (
    projection: ProjectionType,
    setProjection: (p: ProjectionType) => void,
  ) => void;
}

export function MapView({ onProjectionReady }: MapViewProps = {}) {
  const mapRef = useRef<MapRef>(null);
  const { state, actions } = useAppState();
  const { pmtilesUrl, isLoading, error } = useMapData(state.selectedYear);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { isHoveringTerritory, handleMouseMove } = useMapHover();
  const { projection, setProjection } = useProjection(mapRef, mapLoaded);

  useEffect(() => {
    onProjectionReady?.(projection, setProjection);
  }, [projection, setProjection, onProjectionReady]);

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

  const handleLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;
      if (!features || features.length === 0) {
        actions.setInfoPanelOpen(false);
        actions.setSelectedTerritory(null);
        return;
      }

      const feature = features[0];
      if (!feature) return;
      const properties = feature.properties as TerritoryProperties;

      const territoryName = properties.NAME || properties.SUBJECTO;

      if (territoryName) {
        actions.setSelectedTerritory(territoryName);
        actions.setInfoPanelOpen(true);
      }
    },
    [actions],
  );

  const handleKeyDown = useMapKeyboard(mapRef);

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
      {(isLoading || !mapLoaded) && (
        <output
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ backgroundColor: '#1a2a3a' }}
          data-testid="loading-overlay"
          aria-label="Loading map data"
        >
          <div className="flex flex-col items-center">
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
            {state.selectedTerritory && (
              <TerritoryHighlightLayer
                sourceId={SOURCE_ID}
                sourceLayer={SOURCE_LAYER_TERRITORIES}
                selectedTerritory={state.selectedTerritory}
              />
            )}
            <TerritoryLabel sourceId={SOURCE_ID} sourceLayer={SOURCE_LAYER_LABELS} />
          </Source>
        </MapGL>
      )}
    </div>
  );
}
