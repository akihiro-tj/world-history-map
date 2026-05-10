import * as turf from '@turf/turf';
import type { GeoJSONFeature } from '@/types/geojson.ts';
import type { DescriptionLookup } from './merge.ts';
import { TerritoryBounds } from './territory-bounds.ts';

const KEPT_PROPERTIES = new Set([
  'NAME',
  'SUBJECTO',
  'BBOX_W',
  'BBOX_S',
  'BBOX_E',
  'BBOX_N',
  'BBOX_AM',
]);

function stripProperties(props: Record<string, unknown>): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const key of KEPT_PROPERTIES) {
    if (key in props) {
      stripped[key] = props[key];
    }
  }
  return stripped;
}

function extractPolygons(features: GeoJSONFeature[]): number[][][][] {
  const polygonCoordinates: number[][][][] = [];
  for (const feature of features) {
    if (feature.geometry.type === 'Polygon') {
      polygonCoordinates.push(feature.geometry.coordinates as number[][][]);
    } else if (feature.geometry.type === 'MultiPolygon') {
      for (const polygon of feature.geometry.coordinates as number[][][][]) {
        polygonCoordinates.push(polygon);
      }
    }
  }
  return polygonCoordinates;
}

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export class Territory {
  readonly name: string;
  private readonly features: GeoJSONFeature[];

  private constructor(name: string, features: GeoJSONFeature[]) {
    this.name = name;
    this.features = features;
  }

  static fromGroup(name: string, features: GeoJSONFeature[]): Territory {
    return new Territory(name, features);
  }

  toMergedFeature(): ReturnType<typeof turf.feature> {
    if (this.features.length === 1 && this.features[0]) {
      const singleFeature = this.features[0];
      singleFeature.properties = stripProperties(singleFeature.properties ?? {});
      return singleFeature as unknown as ReturnType<typeof turf.feature>;
    }
    const allPolygonCoords = extractPolygons(this.features);
    const properties = stripProperties(this.features[0]?.properties ?? {});
    return turf.multiPolygon(allPolygonCoords, properties);
  }

  mainPolygon(
    mergedFeature: ReturnType<typeof turf.feature>,
  ): ReturnType<typeof turf.polygon> | null {
    if (mergedFeature.geometry?.type === 'Polygon') {
      return mergedFeature as unknown as ReturnType<typeof turf.polygon>;
    }
    if (mergedFeature.geometry?.type === 'MultiPolygon') {
      const coords = (mergedFeature.geometry as { coordinates: number[][][][] }).coordinates;
      let largestPolygon: ReturnType<typeof turf.polygon> | null = null;
      let largestArea = 0;
      for (const polygonCoords of coords) {
        const polygon = turf.polygon(polygonCoords);
        const area = turf.area(polygon);
        if (area > largestArea) {
          largestArea = area;
          largestPolygon = polygon;
        }
      }
      return largestPolygon;
    }
    return null;
  }

  bounds(mergedFeature: ReturnType<typeof turf.feature>): TerritoryBounds | null {
    const mainPoly = this.mainPolygon(mergedFeature);
    return mainPoly ? TerritoryBounds.fromPolygon(mainPoly) : null;
  }

  labelPoint(
    mainPoly: ReturnType<typeof turf.polygon>,
    mergedProperties: Record<string, unknown>,
    translations: DescriptionLookup,
  ): ReturnType<typeof turf.point> {
    const labelPoint = turf.pointOnFeature(mainPoly);
    const labelProperties: Record<string, unknown> = { ...mergedProperties };
    const nameJa = translations[toKebabCase(this.name)]?.name;
    if (nameJa) {
      labelProperties['name_ja'] = nameJa;
    }
    labelPoint.properties = labelProperties;
    return labelPoint as unknown as ReturnType<typeof turf.point>;
  }
}
