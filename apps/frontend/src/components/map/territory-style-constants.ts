import type { ExpressionSpecification } from 'maplibre-gl';

export const LABEL_TEXT_COLOR = '#f0f0f0';
export const LABEL_HALO_COLOR = '#1a1a1a';
export const LABEL_HALO_WIDTH = 1.5;
export const LABEL_HALO_BLUR = 0.5;
export const LABEL_MAX_WIDTH = 8;
export const LABEL_RADIAL_OFFSET = 0.5;
export const LABEL_PADDING = 2;

export const LABEL_TEXT_SIZE_STOPS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  7,
  3,
  10,
  6,
  13,
  10,
  16,
];

export const LABEL_OPACITY_STOPS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  2,
  0.6,
  4,
  0.9,
  6,
  1,
];

export const LABEL_ANCHOR: ('center' | 'top' | 'bottom' | 'left' | 'right')[] = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
];

export const TERRITORY_FILL_OPACITY = 0.7;

// Mirrors --color-role-selected from index.css.
// MapLibre paint props cannot reference CSS variables.
export const HIGHLIGHT_COLOR = '#f43f5e';
export const HIGHLIGHT_FILL_OPACITY = 0.2;
export const HIGHLIGHT_LINE_WIDTH = 3.5;

export const LOADING_SPIN_DURATION = '3s';
