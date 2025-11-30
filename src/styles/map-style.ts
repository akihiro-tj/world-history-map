import type { StyleSpecification } from 'maplibre-gl';

/**
 * Default map configuration
 */
export const MAP_CONFIG = {
  /** Initial longitude */
  initialLongitude: 0,
  /** Initial latitude */
  initialLatitude: 30,
  /** Initial zoom level */
  initialZoom: 2,
  /** Minimum zoom level */
  minZoom: 1,
  /** Maximum zoom level */
  maxZoom: 10,
} as const;

/**
 * Territory layer IDs
 */
export const LAYER_IDS = {
  /** Territory fill layer */
  territoryFill: 'territory-fill',
  /** Territory border layer */
  territoryBorder: 'territory-border',
  /** Territory label layer */
  territoryLabel: 'territory-label',
} as const;

/**
 * PMTiles source ID
 */
export const SOURCE_ID = 'territories';

/**
 * Generate base map style
 *
 * MapLibre style for displaying historical-basemaps PMTiles.
 * Includes territory fill and borders.
 *
 * @param pmtilesUrl PMTiles file URL (using pmtiles:// scheme)
 * @returns MapLibre style specification
 *
 * @example
 * ```ts
 * const style = createMapStyle('pmtiles:///pmtiles/world_1650.pmtiles');
 * <Map mapStyle={style} />
 * ```
 */
export function createMapStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    name: 'World History Atlas',
    sources: {
      [SOURCE_ID]: {
        type: 'vector',
        url: pmtilesUrl,
      },
    },
    layers: [
      // Background color (ocean)
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#b3d1ff',
        },
      },
      // Territory fill
      {
        id: LAYER_IDS.territoryFill,
        type: 'fill',
        source: SOURCE_ID,
        'source-layer': 'territories',
        paint: {
          // Temporary fill color (to be overridden by color-scheme.ts)
          'fill-color': '#d4e6d4',
          'fill-opacity': 0.8,
        },
      },
      // Territory border
      {
        id: LAYER_IDS.territoryBorder,
        type: 'line',
        source: SOURCE_ID,
        'source-layer': 'territories',
        paint: {
          'line-color': '#666666',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1, 10, 2],
          'line-opacity': 0.7,
        },
      },
      // Territory label
      {
        id: LAYER_IDS.territoryLabel,
        type: 'symbol',
        source: SOURCE_ID,
        'source-layer': 'territories',
        layout: {
          'text-field': ['get', 'NAME'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 8, 5, 12, 10, 16],
          'text-max-width': 8,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.7, 5, 1],
        },
      },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  };
}

/**
 * Initial map view state
 */
export const initialViewState = {
  longitude: MAP_CONFIG.initialLongitude,
  latitude: MAP_CONFIG.initialLatitude,
  zoom: MAP_CONFIG.initialZoom,
};
