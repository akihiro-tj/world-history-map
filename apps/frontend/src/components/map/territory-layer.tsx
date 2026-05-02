import { Layer } from 'react-map-gl/maplibre';
import { createMatchColorExpression } from './color-scheme';
import { TERRITORY_FILL_OPACITY } from './territory-fill-constants';

interface TerritoryLayerProps {
  sourceId: string;
  sourceLayer: string;
  colorScheme: Record<string, string> | null;
}

export const TERRITORY_LAYER_IDS = {
  fill: 'territory-fill',
} as const;

export function TerritoryLayer({ sourceId, sourceLayer, colorScheme }: TerritoryLayerProps) {
  return (
    <Layer
      id={TERRITORY_LAYER_IDS.fill}
      type="fill"
      source={sourceId}
      source-layer={sourceLayer}
      paint={{
        'fill-color': createMatchColorExpression(colorScheme),
        'fill-opacity': TERRITORY_FILL_OPACITY,
      }}
    />
  );
}
