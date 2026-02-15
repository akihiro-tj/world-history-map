/**
 * Validation report generation
 * Aggregates per-year validation results into a summary report
 */
import type {
  ValidationReport,
  ValidationResult,
  YearValidationSummary,
} from '@/types/pipeline.ts';

/**
 * Generate a validation report from an array of per-year validation results.
 */
export function generateReport(runId: string, results: ValidationResult[]): ValidationReport {
  const yearSummaries: YearValidationSummary[] = results.map((r) => ({
    year: r.year,
    featureCount: r.featureCount,
    territoryCount: r.featureCount,
    errors: r.errors.length,
    warnings: r.warnings.length,
    repairs: r.repairs.length,
  }));

  return {
    runId,
    timestamp: new Date().toISOString(),
    totalYears: results.length,
    totalFeatures: results.reduce((sum, r) => sum + r.featureCount, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    totalRepairs: results.reduce((sum, r) => sum + r.repairs.length, 0),
    yearSummaries,
  };
}
