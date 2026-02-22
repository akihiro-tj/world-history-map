import { Layer } from 'react-map-gl/maplibre';
import { TERRITORY_LABEL_ID } from './territory-label';

interface TerritoryHighlightLayerProps {
  sourceId: string;
  sourceLayer: string;
  selectedTerritory: string;
}

export function TerritoryHighlightLayer({
  sourceId,
  sourceLayer,
  selectedTerritory,
}: TerritoryHighlightLayerProps) {
  const filter: ['==', ['get', string], string] = ['==', ['get', 'NAME'], selectedTerritory];

  return (
    <>
      <Layer
        id="territory-highlight-fill"
        type="fill"
        source={sourceId}
        source-layer={sourceLayer}
        beforeId={TERRITORY_LABEL_ID}
        filter={filter}
        paint={{
          'fill-color': '#ffffff',
          'fill-opacity': 0.15,
        }}
      />
      <Layer
        id="territory-highlight-outline"
        type="line"
        source={sourceId}
        source-layer={sourceLayer}
        beforeId={TERRITORY_LABEL_ID}
        filter={filter}
        paint={{
          'line-color': '#ffffff',
          'line-width': 3.5,
        }}
      />
    </>
  );
}
