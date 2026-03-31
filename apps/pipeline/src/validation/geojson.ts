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

interface RepairStrategy {
  type: RepairAction['type'];
  attempt(feature: GeoJSONFeature): GeoJSONFeature | null;
}

interface RepairResult {
  feature: GeoJSONFeature | null;
  repairs: RepairAction[];
  warnings: ValidationWarning[];
}

const cleanCoordsStrategy: RepairStrategy = {
  type: 'clean_coords',
  attempt(feature) {
    const cleaned = turf.cleanCoords(feature as unknown as Parameters<typeof turf.cleanCoords>[0]);
    if (turf.booleanValid(cleaned as unknown as Parameters<typeof turf.booleanValid>[0])) {
      return cleaned as unknown as GeoJSONFeature;
    }
    return null;
  },
};

const rewindStrategy: RepairStrategy = {
  type: 'rewind',
  attempt(feature) {
    const rewound = turf.rewind(feature as unknown as Parameters<typeof turf.rewind>[0]);
    if (turf.booleanValid(rewound as unknown as Parameters<typeof turf.booleanValid>[0])) {
      return rewound as unknown as GeoJSONFeature;
    }
    return null;
  },
};

const bufferZeroStrategy: RepairStrategy = {
  type: 'buffer_zero',
  attempt(feature) {
    const buffered = turf.buffer(
      feature as unknown as Parameters<typeof turf.buffer>[0],
      0,
    ) as unknown;
    if (
      buffered &&
      typeof buffered === 'object' &&
      (buffered as GeoJSONFeature).type === 'Feature' &&
      turf.booleanValid(buffered as Parameters<typeof turf.booleanValid>[0])
    ) {
      return buffered as GeoJSONFeature;
    }
    return null;
  },
};

const unkinkStrategy: RepairStrategy = {
  type: 'unkink',
  attempt(feature) {
    if (feature.geometry.type !== 'Polygon') return null;

    const unkinked = turf.unkinkPolygon(
      feature as unknown as Parameters<typeof turf.unkinkPolygon>[0],
    );
    if (unkinked.features.length === 0) return null;

    const coords = unkinked.features
      .map((f) => f.geometry.coordinates)
      .filter((c): c is number[][][] => c !== undefined);

    if (coords.length === 0) return null;

    return turf.multiPolygon(
      coords,
      (feature.properties ?? undefined) as Record<string, unknown> | undefined,
    ) as unknown as GeoJSONFeature;
  },
};

const repairStrategies: RepairStrategy[] = [
  cleanCoordsStrategy,
  rewindStrategy,
  bufferZeroStrategy,
  unkinkStrategy,
];

function attemptRepair(
  feature: GeoJSONFeature,
  featureIndex: number,
  featureName: string,
): RepairResult {
  const repairs: RepairAction[] = [];
  const warnings: ValidationWarning[] = [];
  const current = feature;

  for (const strategy of repairStrategies) {
    try {
      const result = strategy.attempt(current);
      if (result) {
        repairs.push({ type: strategy.type, featureIndex, featureName });
        warnings.push({
          type: 'repaired_geometry',
          featureIndex,
          details: `"${featureName}" repaired via ${strategy.type.replace('_', '-')}`,
        });
        return { feature: result, repairs, warnings };
      }
    } catch {}
  }

  return { feature: null, repairs, warnings };
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

  const repairedFeatures = [...geojson.features];

  for (let i = 0; i < repairedFeatures.length; i++) {
    const feature = repairedFeatures[i];
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
        const repairResult = attemptRepair(feature, i, name);
        repairs.push(...repairResult.repairs);
        warnings.push(...repairResult.warnings);
        if (repairResult.feature) {
          repairedFeatures[i] = repairResult.feature;
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
    featureCount: repairedFeatures.length,
    errors,
    warnings,
    repairs,
  };
}
