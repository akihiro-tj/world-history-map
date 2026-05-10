import { describe, expect, it } from 'vitest';
import { TerritoryBounds } from './territory-bounds';

describe('TerritoryBounds.fromFeatureProperties', () => {
  const validProps = {
    BBOX_W: 2,
    BBOX_S: 46,
    BBOX_E: 3,
    BBOX_N: 47,
    BBOX_AM: 0,
  };

  it('returns TerritoryBounds for valid normal properties', () => {
    const result = TerritoryBounds.fromFeatureProperties(validProps);
    expect(result).not.toBeNull();
    expect(result?.west).toBe(2);
    expect(result?.south).toBe(46);
    expect(result?.east).toBe(3);
    expect(result?.north).toBe(47);
    expect(result?.crossesAntimeridian).toBe(false);
  });

  it('passes through antimeridian flag when BBOX_AM is 1', () => {
    const props = { BBOX_W: 178, BBOX_S: -10, BBOX_E: 182, BBOX_N: 10, BBOX_AM: 1 };
    const result = TerritoryBounds.fromFeatureProperties(props);
    expect(result).not.toBeNull();
    expect(result?.crossesAntimeridian).toBe(true);
    expect(result?.east).toBe(182);
  });

  it('returns null when any property is missing', () => {
    const { BBOX_E: _e, ...withoutE } = validProps;
    expect(TerritoryBounds.fromFeatureProperties(withoutE)).toBeNull();

    const { BBOX_AM: _am, ...withoutAM } = validProps;
    expect(TerritoryBounds.fromFeatureProperties(withoutAM)).toBeNull();
  });

  it('returns null when a property is not a number', () => {
    expect(
      TerritoryBounds.fromFeatureProperties({ ...validProps, BBOX_W: 'not-a-number' }),
    ).toBeNull();
    expect(TerritoryBounds.fromFeatureProperties({ ...validProps, BBOX_AM: 'yes' })).toBeNull();
  });

  it('returns null when south > north (invalid invariant)', () => {
    expect(
      TerritoryBounds.fromFeatureProperties({ ...validProps, BBOX_S: 50, BBOX_N: 46 }),
    ).toBeNull();
  });

  it('returns null when west is outside [-180, 180]', () => {
    expect(TerritoryBounds.fromFeatureProperties({ ...validProps, BBOX_W: -190 })).toBeNull();
    expect(TerritoryBounds.fromFeatureProperties({ ...validProps, BBOX_W: 200 })).toBeNull();
  });
});

describe('TerritoryBounds.toFitBoundsTuple', () => {
  it('returns [[west, south], [east, north]] for normal bounds', () => {
    const bounds = TerritoryBounds.fromFeatureProperties({
      BBOX_W: 2,
      BBOX_S: 46,
      BBOX_E: 3,
      BBOX_N: 47,
      BBOX_AM: 0,
    });
    expect(bounds?.toFitBoundsTuple()).toEqual([
      [2, 46],
      [3, 47],
    ]);
  });

  it('passes east > 180 through directly for antimeridian bounds', () => {
    const bounds = TerritoryBounds.fromFeatureProperties({
      BBOX_W: 178,
      BBOX_S: -10,
      BBOX_E: 182,
      BBOX_N: 10,
      BBOX_AM: 1,
    });
    expect(bounds?.toFitBoundsTuple()).toEqual([
      [178, -10],
      [182, 10],
    ]);
  });
});
