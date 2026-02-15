/**
 * Merge stage: group features by NAME and merge into MultiPolygons
 * Generates centroid label points for each territory
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import * as turf from '@turf/turf';
import { PATHS, yearToLabelsFilename, yearToMergedFilename } from '@/pipeline/config.ts';
import type { PipelineLogger } from '@/pipeline/stages/types.ts';

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface MergeResult {
  polygons: ReturnType<typeof turf.featureCollection>;
  labels: ReturnType<typeof turf.featureCollection>;
}

/**
 * Merge features by NAME property.
 * Same-name polygons become MultiPolygons, and a centroid label point
 * is generated for each unique territory.
 */
export function mergeByName(geojson: FeatureCollection): MergeResult {
  // Group features by NAME
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

  // Merge each group
  const mergedFeatures: ReturnType<typeof turf.feature>[] = [];
  const labelPoints: ReturnType<typeof turf.point>[] = [];

  for (const [name, features] of groups) {
    let mergedFeature: ReturnType<typeof turf.feature>;

    if (features.length === 1 && features[0]) {
      mergedFeature = features[0] as unknown as ReturnType<typeof turf.feature>;
      mergedFeatures.push(mergedFeature);
    } else {
      // Collect all polygon coordinates
      const allPolygonCoords: number[][][][] = [];

      for (const f of features) {
        if (f.geometry.type === 'Polygon') {
          allPolygonCoords.push(f.geometry.coordinates as number[][][]);
        } else if (f.geometry.type === 'MultiPolygon') {
          for (const poly of f.geometry.coordinates as number[][][][]) {
            allPolygonCoords.push(poly);
          }
        }
      }

      const firstFeature = features[0];
      const properties = firstFeature ? { ...firstFeature.properties } : {};
      mergedFeature = turf.multiPolygon(allPolygonCoords, properties);
      mergedFeatures.push(mergedFeature);
    }

    // Generate label point on the largest polygon
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

/**
 * Run the merge stage for a single year.
 */
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

  const polygonsPath = path.join(PATHS.mergedGeojson, yearToMergedFilename(year));
  const labelsPath = path.join(PATHS.mergedGeojson, yearToLabelsFilename(year));

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
