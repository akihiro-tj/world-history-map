import { Layer } from 'react-map-gl/maplibre';

/**
 * TerritoryLabel props
 */
interface TerritoryLabelProps {
  /** Source ID for the vector tiles */
  sourceId: string;
  /** Source layer name within the vector tiles */
  sourceLayer: string;
}

/**
 * Layer ID for territory labels
 */
export const TERRITORY_LABEL_ID = 'territory-label';

/**
 * Territory label layer component
 *
 * Renders territory name labels on the map using the NAME property.
 * Labels are styled with halo for readability and sized based on zoom level.
 *
 * @example
 * ```tsx
 * <Source id="territories" type="vector" url={pmtilesUrl}>
 *   <TerritoryLabel sourceId="territories" sourceLayer="territories" />
 * </Source>
 * ```
 */
export function TerritoryLabel({ sourceId, sourceLayer }: TerritoryLabelProps) {
  return (
    <Layer
      id={TERRITORY_LABEL_ID}
      type="symbol"
      source={sourceId}
      source-layer={sourceLayer}
      layout={{
        'text-field': ['get', 'NAME'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 8, 5, 12, 10, 16],
        'text-max-width': 8,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-padding': 10,
        'text-optional': true,
        'symbol-sort-key': ['get', 'NAME'],
      }}
      paint={{
        'text-color': '#1a1a1a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 4, 0.9, 6, 1],
      }}
    />
  );
}
