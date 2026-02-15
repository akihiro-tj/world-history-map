/**
 * Validate stage: run GeoJSON validation on merged data
 * Blocks pipeline on errors, continues with warnings
 */
import { readFileSync } from 'node:fs';
import type { PipelineLogger } from '@/pipeline/stages/types.ts';
import { validateGeoJSON } from '@/pipeline/validation/geojson.ts';
import type { ValidationResult } from '@/types/pipeline.ts';

/**
 * Run validation for a single year's merged GeoJSON.
 */
export function runValidateForYear(
  year: number,
  mergedGeojsonPath: string,
  logger: PipelineLogger,
): ValidationResult {
  const content = readFileSync(mergedGeojsonPath, 'utf-8');
  const geojson = JSON.parse(content);

  const result = validateGeoJSON(geojson, year);

  if (result.errors.length > 0) {
    logger.error(
      'validate',
      `Year ${year}: ${result.errors.length} errors, ${result.warnings.length} warnings`,
    );
    for (const err of result.errors) {
      logger.error('validate', `  ${err.type}: ${err.details}`);
    }
  } else {
    logger.info(
      'validate',
      `Year ${year}: ${result.featureCount} features, ${result.errors.length} errors, ${result.warnings.length} warnings`,
    );
  }

  if (result.repairs.length > 0) {
    logger.info('validate', `Year ${year}: ${result.repairs.length} auto-repairs applied`);
  }

  return result;
}
