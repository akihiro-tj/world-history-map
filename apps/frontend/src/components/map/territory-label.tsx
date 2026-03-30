import { Layer } from 'react-map-gl/maplibre';
import {
  LABEL_ANCHOR,
  LABEL_HALO_BLUR,
  LABEL_HALO_COLOR,
  LABEL_HALO_WIDTH,
  LABEL_MAX_WIDTH,
  LABEL_OPACITY_STOPS,
  LABEL_PADDING,
  LABEL_RADIAL_OFFSET,
  LABEL_TEXT_COLOR,
  LABEL_TEXT_SIZE_STOPS,
} from './territory-style-constants';

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
        'text-size': LABEL_TEXT_SIZE_STOPS,
        'text-max-width': LABEL_MAX_WIDTH,
        'text-variable-anchor': LABEL_ANCHOR,
        'text-radial-offset': LABEL_RADIAL_OFFSET,
        'text-justify': 'auto',
        'text-padding': LABEL_PADDING,
        'text-optional': true,
      }}
      paint={{
        'text-color': LABEL_TEXT_COLOR,
        'text-halo-color': LABEL_HALO_COLOR,
        'text-halo-width': LABEL_HALO_WIDTH,
        'text-halo-blur': LABEL_HALO_BLUR,
        'text-opacity': LABEL_OPACITY_STOPS,
      }}
    />
  );
}
