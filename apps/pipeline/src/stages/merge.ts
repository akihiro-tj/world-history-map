import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import * as turf from '@turf/turf';
import { PATHS, YearPaths } from '@/config.ts';
import type { PipelineLogger } from '@/stages/types.ts';
import type { FeatureCollection, GeoJSONFeature } from '@/types/geojson.ts';

const KEPT_PROPERTIES = new Set(['NAME', 'SUBJECTO']);

function stripProperties(props: Record<string, unknown>): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const key of KEPT_PROPERTIES) {
    if (key in props) {
      stripped[key] = props[key];
    }
  }
  return stripped;
}

interface MergeResult {
  polygons: ReturnType<typeof turf.featureCollection>;
  labels: ReturnType<typeof turf.featureCollection>;
}

export function mergeByName(geojson: FeatureCollection): MergeResult {
  const groups = new Map<string, GeoJSONFeature[]>();

  for (const feature of geojson.features) {
    const name = (feature.properties?.['NAME'] as string | undefined) ?? 'Unknown';
    const group = groups.get(name);
    if (group) {
      group.push(feature);
    } else {
      groups.set(name, [feature]);
    }
  }

  const mergedFeatures: ReturnType<typeof turf.feature>[] = [];
  const labelPoints: ReturnType<typeof turf.point>[] = [];

  for (const [name, features] of groups) {
    let mergedFeature: ReturnType<typeof turf.feature>;

    if (features.length === 1 && features[0]) {
      const singleFeature = features[0];
      singleFeature.properties = stripProperties(singleFeature.properties ?? {});
      mergedFeature = singleFeature as unknown as ReturnType<typeof turf.feature>;
      mergedFeatures.push(mergedFeature);
    } else {
      const allPolygonCoords: number[][][][] = [];

      for (const feature of features) {
        if (feature.geometry.type === 'Polygon') {
          allPolygonCoords.push(feature.geometry.coordinates as number[][][]);
        } else if (feature.geometry.type === 'MultiPolygon') {
          for (const poly of feature.geometry.coordinates as number[][][][]) {
            allPolygonCoords.push(poly);
          }
        }
      }

      const firstFeature = features[0];
      const properties = firstFeature ? stripProperties(firstFeature.properties ?? {}) : {};
      mergedFeature = turf.multiPolygon(allPolygonCoords, properties);
      mergedFeatures.push(mergedFeature);
    }

    try {
      let largestPoly: ReturnType<typeof turf.polygon> | null = null;
      let largestArea = 0;

      if (mergedFeature.geometry.type === 'Polygon') {
        largestPoly = mergedFeature as unknown as ReturnType<typeof turf.polygon>;
      } else if (mergedFeature.geometry.type === 'MultiPolygon') {
        const coords = (mergedFeature.geometry as { coordinates: number[][][][] }).coordinates;
        for (const polyCoords of coords) {
          const poly = turf.polygon(polyCoords);
          const area = turf.area(poly);
          if (area > largestArea) {
            largestArea = area;
            largestPoly = poly;
          }
        }
      }

      if (largestPoly) {
        const labelPoint = turf.pointOnFeature(largestPoly);
        labelPoint.properties = { ...mergedFeature.properties };
        labelPoints.push(labelPoint as unknown as ReturnType<typeof turf.point>);
      }
    } catch {
      // Skip label generation on error, log handled by caller
      void name;
    }
  }

  return {
    polygons: turf.featureCollection(mergedFeatures),
    labels: turf.featureCollection(labelPoints),
  };
}

export async function runMergeForYear(
  year: number,
  sourcePath: string,
  logger: PipelineLogger,
): Promise<{ polygonsPath: string; labelsPath: string; featureCount: number; labelCount: number }> {
  await mkdir(PATHS.mergedGeojson, { recursive: true });

  const inputData = readFileSync(sourcePath, 'utf-8');
  const geojson = JSON.parse(inputData) as FeatureCollection;

  logger.info('merge', `Year ${year}: ${geojson.features.length} input features`);

  const { polygons, labels } = mergeByName(geojson);

  const yearPaths = new YearPaths(year);
  const polygonsPath = yearPaths.mergedGeojsonPath;
  const labelsPath = yearPaths.labelsGeojsonPath;

  writeFileSync(polygonsPath, JSON.stringify(polygons));
  writeFileSync(labelsPath, JSON.stringify(labels));

  logger.info(
    'merge',
    `Year ${year}: ${polygons.features.length} territories, ${labels.features.length} labels`,
  );

  return {
    polygonsPath,
    labelsPath,
    featureCount: polygons.features.length,
    labelCount: labels.features.length,
  };
}
