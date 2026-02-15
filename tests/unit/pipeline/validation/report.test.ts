import { describe, expect, it } from 'vitest';
import { generateReport } from '@/pipeline/validation/report.ts';
import type { ValidationResult } from '@/types/pipeline.ts';

describe('validation report', () => {
  describe('generateReport', () => {
    it('should aggregate year summaries correctly', () => {
      const results: ValidationResult[] = [
        {
          year: 1650,
          passed: true,
          featureCount: 42,
          errors: [],
          warnings: [{ type: 'repaired_geometry', featureIndex: 0, details: 'rewound' }],
          repairs: [{ type: 'rewind', featureIndex: 0, featureName: 'France' }],
        },
        {
          year: 1700,
          passed: true,
          featureCount: 38,
          errors: [],
          warnings: [],
          repairs: [],
        },
      ];

      const report = generateReport('run-1', results);

      expect(report.totalYears).toBe(2);
      expect(report.totalFeatures).toBe(80);
      expect(report.totalErrors).toBe(0);
      expect(report.totalWarnings).toBe(1);
      expect(report.totalRepairs).toBe(1);
      expect(report.yearSummaries).toHaveLength(2);
    });

    it('should count errors across years', () => {
      const results: ValidationResult[] = [
        {
          year: 1650,
          passed: false,
          featureCount: 10,
          errors: [
            { type: 'invalid_geometry_type', featureIndex: 0, details: 'invalid type' },
            { type: 'invalid_geometry_type', featureIndex: 1, details: 'invalid type' },
          ],
          warnings: [],
          repairs: [],
        },
        {
          year: 1700,
          passed: false,
          featureCount: 5,
          errors: [{ type: 'empty_collection', featureIndex: -1, details: 'empty' }],
          warnings: [],
          repairs: [],
        },
      ];

      const report = generateReport('run-2', results);

      expect(report.totalErrors).toBe(3);
      expect(report.yearSummaries[0]?.errors).toBe(2);
      expect(report.yearSummaries[1]?.errors).toBe(1);
    });

    it('should include run metadata', () => {
      const report = generateReport('run-3', []);

      expect(report.runId).toBe('run-3');
      expect(report.timestamp).toBeTruthy();
      expect(report.totalYears).toBe(0);
    });
  });
});
