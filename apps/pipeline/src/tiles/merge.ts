import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import * as turf from '@turf/turf';
import { PATHS, YearPaths } from '@/config.ts';
import type { PipelineLogger } from '@/shared/logger.ts';
import type { FeatureCollection, GeoJSONFeature } from '@/types/geojson.ts';
import { Territory } from './territory.ts';

export type DescriptionLookup = Record<string, { name?: string }>;

interface MergeResult {
  polygons: ReturnType<typeof turf.featureCollection>;
  labels: ReturnType<typeof turf.featureCollection>;
}

function groupFeaturesByName(features: GeoJSONFeature[]): Map<string, GeoJSONFeature[]> {
  const groupedByName = new Map<string, GeoJSONFeature[]>();
  for (const feature of features) {
    const name = (feature.properties?.['NAME'] as string | undefined) ?? 'Unknown';
    const group = groupedByName.get(name);
    if (group) {
      group.push(feature);
    } else {
      groupedByName.set(name, [feature]);
    }
  }
  return groupedByName;
}

export function mergeByName(
  geojson: FeatureCollection,
  descriptions: DescriptionLookup = {},
): MergeResult {
  const groupedByName = groupFeaturesByName(geojson.features);
  const mergedFeatures: ReturnType<typeof turf.feature>[] = [];
  const labelPoints: ReturnType<typeof turf.point>[] = [];

  for (const [name, features] of groupedByName) {
    const territory = Territory.fromGroup(name, features);
    const mergedFeature = territory.toMergedFeature();
    const mainPoly = territory.mainPolygon(mergedFeature);

    if (mainPoly) {
      const bounds = territory.bounds(mergedFeature);
      if (bounds) {
        mergedFeature.properties = {
          ...mergedFeature.properties,
          ...bounds.toFeatureProperties(),
        };
      }
      labelPoints.push(
        territory.labelPoint(mainPoly, mergedFeature.properties ?? {}, descriptions),
      );
    }

    mergedFeatures.push(mergedFeature);
  }

  return {
    polygons: turf.featureCollection(mergedFeatures),
    labels: turf.featureCollection(labelPoints),
  };
}

export async function runMergeForYear(
  year: number,
  sourcePath: string,
  descriptionsPath: string | undefined,
  logger: PipelineLogger,
): Promise<{ polygonsPath: string; labelsPath: string; featureCount: number; labelCount: number }> {
  await mkdir(PATHS.mergedGeojson, { recursive: true });

  const inputData = readFileSync(sourcePath, 'utf-8');
  const geojson = JSON.parse(inputData) as FeatureCollection;

  logger.info('merge', `Year ${year}: ${geojson.features.length} input features`);

  let descriptions: DescriptionLookup = {};
  if (descriptionsPath && existsSync(descriptionsPath)) {
    descriptions = JSON.parse(readFileSync(descriptionsPath, 'utf-8')) as DescriptionLookup;
    logger.info('merge', `Year ${year}: loaded ${Object.keys(descriptions).length} descriptions`);
  }

  const { polygons, labels } = mergeByName(geojson, descriptions);

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
