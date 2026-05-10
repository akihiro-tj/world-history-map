const MIN_LONGITUDE_DEG = -180;
const MAX_LONGITUDE_DEG = 180;
const ANTIMERIDIAN_FLAG_TRUE = 1;

export class TerritoryBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
  readonly crossesAntimeridian: boolean;

  private constructor(
    west: number,
    south: number,
    east: number,
    north: number,
    crossesAntimeridian: boolean,
  ) {
    this.west = west;
    this.south = south;
    this.east = east;
    this.north = north;
    this.crossesAntimeridian = crossesAntimeridian;
  }

  static fromFeatureProperties(properties: Record<string, unknown>): TerritoryBounds | null {
    const west = properties['BBOX_W'];
    const south = properties['BBOX_S'];
    const east = properties['BBOX_E'];
    const north = properties['BBOX_N'];
    const antimeridianFlag = properties['BBOX_AM'];

    if (
      typeof west !== 'number' ||
      typeof south !== 'number' ||
      typeof east !== 'number' ||
      typeof north !== 'number' ||
      typeof antimeridianFlag !== 'number'
    ) {
      return null;
    }

    if (west < MIN_LONGITUDE_DEG || west > MAX_LONGITUDE_DEG) return null;
    if (south > north) return null;

    return new TerritoryBounds(
      west,
      south,
      east,
      north,
      antimeridianFlag === ANTIMERIDIAN_FLAG_TRUE,
    );
  }

  toFitBoundsTuple(): [[number, number], [number, number]] {
    return [
      [this.west, this.south],
      [this.east, this.north],
    ];
  }
}
