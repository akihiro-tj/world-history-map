import { Layer } from 'react-map-gl/maplibre';
import {
  HIGHLIGHT_COLOR,
  HIGHLIGHT_FILL_OPACITY,
  HIGHLIGHT_LINE_WIDTH,
} from './highlight-style-constants';
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
          'fill-color': HIGHLIGHT_COLOR,
          'fill-opacity': HIGHLIGHT_FILL_OPACITY,
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
          'line-color': HIGHLIGHT_COLOR,
          'line-width': HIGHLIGHT_LINE_WIDTH,
        }}
      />
    </>
  );
}
