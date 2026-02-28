import * as turf from '@turf/turf';
import type {
  RepairAction,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '@/types/pipeline.ts';

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface FeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

export function validateGeoJSON(geojson: FeatureCollection, year: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const repairs: RepairAction[] = [];

  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    errors.push({
      type: 'empty_collection',
      featureIndex: -1,
      details: 'Not a valid FeatureCollection',
    });
    return { year, passed: false, featureCount: 0, errors, warnings, repairs };
  }

  if (geojson.features.length === 0) {
    errors.push({
      type: 'empty_collection',
      featureIndex: -1,
      details: 'FeatureCollection has no features',
    });
    return { year, passed: false, featureCount: 0, errors, warnings, repairs };
  }

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];
    if (!feature) continue;
    const name = (feature.properties?.['NAME'] as string | undefined) ?? '';

    if (!name) {
      warnings.push({
        type: 'missing_name',
        featureIndex: i,
        details: `Feature at index ${i} is missing NAME property`,
      });
      continue;
    }

    const geomType = feature.geometry?.type;
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
      errors.push({
        type: 'invalid_geometry_type',
        featureIndex: i,
        details: `Feature "${name}" has geometry type "${geomType}", expected Polygon or MultiPolygon`,
      });
      continue;
    }

    try {
      const isValid = turf.booleanValid(
        feature as unknown as Parameters<typeof turf.booleanValid>[0],
      );
      if (!isValid) {
        const repaired = attemptRepair(feature, i, name, repairs, warnings);
        if (repaired) {
          feature.geometry = repaired.geometry as typeof feature.geometry;
        } else {
          warnings.push({
            type: 'unrepairable_geometry',
            featureIndex: i,
            details: `Feature "${name}" has invalid geometry that could not be repaired`,
          });
        }
      }
    } catch {
      warnings.push({
        type: 'repaired_geometry',
        featureIndex: i,
        details: `Feature "${name}" geometry validation threw an error`,
      });
    }
  }

  return {
    year,
    passed: errors.length === 0,
    featureCount: geojson.features.length,
    errors,
    warnings,
    repairs,
  };
}

function attemptRepair(
  feature: GeoJSONFeature,
  featureIndex: number,
  featureName: string,
  repairs: RepairAction[],
  warnings: ValidationWarning[],
): GeoJSONFeature | null {
  let current = feature;

  try {
    const cleaned = turf.cleanCoords(current as unknown as Parameters<typeof turf.cleanCoords>[0]);
    if (turf.booleanValid(cleaned as unknown as Parameters<typeof turf.booleanValid>[0])) {
      repairs.push({ type: 'clean_coords', featureIndex, featureName });
      warnings.push({
        type: 'repaired_geometry',
        featureIndex,
        details: `"${featureName}" repaired via clean-coords`,
      });
      return cleaned as unknown as GeoJSONFeature;
    }
    current = cleaned as unknown as GeoJSONFeature;
  } catch {}

  try {
    const rewound = turf.rewind(current as unknown as Parameters<typeof turf.rewind>[0]);
    if (turf.booleanValid(rewound as unknown as Parameters<typeof turf.booleanValid>[0])) {
      repairs.push({ type: 'rewind', featureIndex, featureName });
      warnings.push({
        type: 'repaired_geometry',
        featureIndex,
        details: `"${featureName}" repaired via rewind`,
      });
      return rewound as unknown as GeoJSONFeature;
    }
    current = rewound as unknown as GeoJSONFeature;
  } catch {}

  try {
    const buffered = turf.buffer(
      current as unknown as Parameters<typeof turf.buffer>[0],
      0,
    ) as unknown;
    if (
      buffered &&
      typeof buffered === 'object' &&
      (buffered as GeoJSONFeature).type === 'Feature' &&
      turf.booleanValid(buffered as Parameters<typeof turf.booleanValid>[0])
    ) {
      repairs.push({ type: 'buffer_zero', featureIndex, featureName });
      warnings.push({
        type: 'repaired_geometry',
        featureIndex,
        details: `"${featureName}" repaired via buffer(0)`,
      });
      return buffered as GeoJSONFeature;
    }
  } catch {}

  try {
    if (current.geometry.type === 'Polygon') {
      const unkinked = turf.unkinkPolygon(
        current as unknown as Parameters<typeof turf.unkinkPolygon>[0],
      );
      if (unkinked.features.length > 0) {
        const coords = unkinked.features
          .map((f) => f.geometry.coordinates)
          .filter((c): c is number[][][] => c !== undefined);

        if (coords.length > 0) {
          const multiPoly = turf.multiPolygon(
            coords,
            (current.properties ?? undefined) as Record<string, unknown> | undefined,
          );
          repairs.push({ type: 'unkink', featureIndex, featureName });
          warnings.push({
            type: 'repaired_geometry',
            featureIndex,
            details: `"${featureName}" repaired via unkink (${coords.length} polygons)`,
          });
          return multiPoly as unknown as GeoJSONFeature;
        }
      }
    }
  } catch {}

  return null;
}
