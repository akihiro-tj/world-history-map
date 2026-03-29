import { Layer } from 'react-map-gl/maplibre';
import { TERRITORY_LABEL_ID } from './territory-label';
import { HIGHLIGHT_COLOR } from './territory-style-constants';

const HIGHLIGHT_FILL_OPACITY = 0.15;
const HIGHLIGHT_LINE_WIDTH = 3.5;

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
