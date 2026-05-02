import { roleColors } from '@world-history-map/design-tokens';
import { buildZoomInterpolation, type ZoomStop } from './zoom-interpolation';

export const LABEL_TEXT_COLOR = roleColors.labelText;
export const LABEL_HALO_COLOR = roleColors.labelHalo;
export const LABEL_HALO_WIDTH = 1.5;
export const LABEL_HALO_BLUR = 0.5;
export const LABEL_MAX_WIDTH = 8;
export const LABEL_RADIAL_OFFSET = 0.5;
export const LABEL_PADDING = 2;

export const LABEL_ANCHOR: ('center' | 'top' | 'bottom' | 'left' | 'right')[] = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
];

const LABEL_TEXT_SIZE_STOPS: readonly ZoomStop[] = [
  { zoom: 0, value: 7 },
  { zoom: 3, value: 10 },
  { zoom: 6, value: 13 },
  { zoom: 10, value: 16 },
];

const LABEL_OPACITY_STOPS: readonly ZoomStop[] = [
  { zoom: 2, value: 0.6 },
  { zoom: 4, value: 0.9 },
  { zoom: 6, value: 1 },
];

export const LABEL_TEXT_SIZE_EXPRESSION = buildZoomInterpolation(LABEL_TEXT_SIZE_STOPS);
export const LABEL_OPACITY_EXPRESSION = buildZoomInterpolation(LABEL_OPACITY_STOPS);
