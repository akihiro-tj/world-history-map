import type { ExpressionSpecification } from 'maplibre-gl';

export interface ZoomStop {
  readonly zoom: number;
  readonly value: number;
}

const MIN_STOPS = 2;

export function buildZoomInterpolation(stops: readonly ZoomStop[]): ExpressionSpecification {
  if (stops.length < MIN_STOPS) {
    throw new Error(
      `buildZoomInterpolation requires at least ${MIN_STOPS} stops, received ${stops.length}.`,
    );
  }
  const flattened = stops.flatMap((stop) => [stop.zoom, stop.value]);
  return ['interpolate', ['linear'], ['zoom'], ...flattened];
}
