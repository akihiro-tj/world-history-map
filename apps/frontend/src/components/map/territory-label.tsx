import { Layer } from 'react-map-gl/maplibre';

interface TerritoryLabelProps {
  sourceId: string;
  sourceLayer: string;
}

export const TERRITORY_LABEL_ID = 'territory-label';

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
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 7, 3, 10, 6, 13, 10, 16],
        'text-max-width': 8,
        'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-justify': 'auto',
        'text-padding': 2,
        'text-optional': true,
      }}
      paint={{
        'text-color': '#f0f0f0',
        'text-halo-color': '#1a1a1a',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 4, 0.9, 6, 1],
      }}
    />
  );
}
