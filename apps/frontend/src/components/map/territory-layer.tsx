import { Layer } from 'react-map-gl/maplibre';
import { createMatchColorExpression } from '../../utils/color-scheme';

interface TerritoryLayerProps {
  sourceId: string;
  sourceLayer: string;
}

export const TERRITORY_LAYER_IDS = {
  fill: 'territory-fill',
} as const;

export function TerritoryLayer({ sourceId, sourceLayer }: TerritoryLayerProps) {
  return (
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
  );
}
