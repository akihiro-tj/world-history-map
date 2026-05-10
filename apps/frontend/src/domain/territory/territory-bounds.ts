export interface TerritoryBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
  readonly crossesAntimeridian: boolean;
}

export function parseFeatureBounds(properties: Record<string, unknown>): TerritoryBounds | null {
  const w = properties['BBOX_W'];
  const s = properties['BBOX_S'];
  const e = properties['BBOX_E'];
  const n = properties['BBOX_N'];
  const am = properties['BBOX_AM'];

  if (
    typeof w !== 'number' ||
    typeof s !== 'number' ||
    typeof e !== 'number' ||
    typeof n !== 'number' ||
    typeof am !== 'number'
  ) {
    return null;
  }

  if (w < -180 || w > 180) return null;
  if (s > n) return null;

  return {
    west: w,
    south: s,
    east: e,
    north: n,
    crossesAntimeridian: am === 1,
  };
}
