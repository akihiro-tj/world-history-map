import * as turf from '@turf/turf';

const MIN_LONGITUDE_DEG = -180;
const MAX_LONGITUDE_DEG = 180;
const ANTIMERIDIAN_GAP_THRESHOLD_DEG = 180;
const FULL_LONGITUDE_SPAN_DEG = 360;

export interface BboxFeatureProperties {
  readonly BBOX_W: number;
  readonly BBOX_S: number;
  readonly BBOX_E: number;
  readonly BBOX_N: number;
  readonly BBOX_AM: 0 | 1;
}

export class TerritoryBounds {
  private constructor(
    readonly west: number,
    readonly south: number,
    readonly east: number,
    readonly north: number,
    readonly crossesAntimeridian: boolean,
  ) {}

  static fromPolygon(polygon: ReturnType<typeof turf.polygon>): TerritoryBounds {
    const ring = polygon.geometry.coordinates[0] as [number, number][];
    const sortedLongitudes = ring.map(([lng]) => lng).sort((a, b) => a - b);
    const { gapDeg, eastSideOfGapIndex } = findLargestLongitudeGap(sortedLongitudes);

    if (gapDeg > ANTIMERIDIAN_GAP_THRESHOLD_DEG) {
      const west = sortedLongitudes[eastSideOfGapIndex] ?? MIN_LONGITUDE_DEG;
      const east =
        (sortedLongitudes[eastSideOfGapIndex - 1] ?? MAX_LONGITUDE_DEG) + FULL_LONGITUDE_SPAN_DEG;
      const lats = ring.map(([, lat]) => lat);
      return new TerritoryBounds(west, Math.min(...lats), east, Math.max(...lats), true);
    }

    const [bboxWest, bboxSouth, bboxEast, bboxNorth] = turf.bbox(polygon) as [
      number,
      number,
      number,
      number,
    ];
    return new TerritoryBounds(bboxWest, bboxSouth, bboxEast, bboxNorth, false);
  }

  toFeatureProperties(): BboxFeatureProperties {
    return {
      BBOX_W: this.west,
      BBOX_S: this.south,
      BBOX_E: this.east,
      BBOX_N: this.north,
      BBOX_AM: this.crossesAntimeridian ? 1 : 0,
    };
  }
}

function findLargestLongitudeGap(sortedLongitudes: number[]): {
  gapDeg: number;
  eastSideOfGapIndex: number;
} {
  let largestGap = 0;
  let eastSideOfGapIndex = 0;
  for (let i = 1; i < sortedLongitudes.length; i++) {
    const currentLongitude = sortedLongitudes[i] ?? 0;
    const previousLongitude = sortedLongitudes[i - 1] ?? 0;
    const longitudeGap = currentLongitude - previousLongitude;
    if (longitudeGap > largestGap) {
      largestGap = longitudeGap;
      eastSideOfGapIndex = i;
    }
  }
  return { gapDeg: largestGap, eastSideOfGapIndex };
}
