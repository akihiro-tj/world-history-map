import { Layer } from 'react-map-gl/maplibre';
import { createMatchColorExpression } from '../../utils/color-scheme';

/**
 * TerritoryLayer props
 */
interface TerritoryLayerProps {
  /** Source ID for the vector tiles */
  sourceId: string;
  /** Source layer name within the vector tiles */
  sourceLayer: string;
}

/**
 * Layer IDs for territory rendering
 */
export const TERRITORY_LAYER_IDS = {
  fill: 'territory-fill',
  border: 'territory-border',
} as const;

/**
 * Territory layer component
 *
 * Renders territory fill and border layers for the map.
 * Uses SUBJECTO property for color coding territories.
 *
 * @example
 * ```tsx
 * <Source id="territories" type="vector" url={pmtilesUrl}>
 *   <TerritoryLayer sourceId="territories" sourceLayer="territories" />
 * </Source>
 * ```
 */
export function TerritoryLayer({ sourceId, sourceLayer }: TerritoryLayerProps) {
  return (
    <>
      {/* Territory fill layer - interactive for click events */}
      <Layer
        id={TERRITORY_LAYER_IDS.fill}
        type="fill"
        source={sourceId}
        source-layer={sourceLayer}
        paint={{
          'fill-color': createMatchColorExpression(),
          'fill-opacity': 0.7,
        }}
      />

      {/* Territory border layer */}
      <Layer
        id={TERRITORY_LAYER_IDS.border}
        type="line"
        source={sourceId}
        source-layer={sourceLayer}
        paint={{
          'line-color': '#333333',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1, 10, 2],
          'line-opacity': 0.8,
        }}
      />
    </>
  );
}
