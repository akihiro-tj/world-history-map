import { describe, expect, it } from 'vitest';
import { buildZoomInterpolation, type ZoomStop } from './zoom-interpolation';

describe('buildZoomInterpolation', () => {
  it('builds a linear zoom interpolation expression from typed stops', () => {
    const stops: ZoomStop[] = [
      { zoom: 0, value: 7 },
      { zoom: 3, value: 10 },
      { zoom: 6, value: 13 },
      { zoom: 10, value: 16 },
    ];

    expect(buildZoomInterpolation(stops)).toEqual([
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
    ]);
  });

  it('accepts the minimum of two stops', () => {
    const stops: ZoomStop[] = [
      { zoom: 2, value: 0.6 },
      { zoom: 6, value: 1 },
    ];

    expect(buildZoomInterpolation(stops)).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      2,
      0.6,
      6,
      1,
    ]);
  });

  it('throws when fewer than two stops are provided', () => {
    expect(() => buildZoomInterpolation([])).toThrow(/at least 2 stops/);
    expect(() => buildZoomInterpolation([{ zoom: 0, value: 1 }])).toThrow(/at least 2 stops/);
  });
});
