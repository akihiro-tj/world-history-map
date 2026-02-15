/**
 * Pipeline-specific type definitions
 * All types for the map data pipeline (fetch → merge → validate → convert → prepare → index → upload)
 */

// --- Pipeline State ---

export interface PipelineState {
  version: 1;
  runId: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  stages: {
    fetch?: {
      completedAt: string;
      sourceCommitHash: string;
    };
  };
  years: Record<string, YearState>;
  indexGen?: {
    completedAt: string | null;
    hash: string | null;
  };
}

export interface YearState {
  source?: { hash: string; fetchedAt: string };
  merge?: { hash: string; completedAt: string; featureCount: number; labelCount: number };
  validate?: { completedAt: string; warnings: number; errors: number };
  convert?: { hash: string; completedAt: string };
  prepare?: { hash: string; hashedFilename: string; completedAt: string };
  upload?: { completedAt: string; skipped: boolean };
}

// --- Validation ---

export interface ValidationResult {
  year: number;
  passed: boolean;
  featureCount: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  repairs: RepairAction[];
}

export interface ValidationError {
  type: 'missing_name' | 'empty_collection' | 'invalid_geometry_type' | 'unrepairable_geometry';
  featureIndex: number;
  details: string;
}

export interface ValidationWarning {
  type: 'missing_subjecto' | 'low_border_precision' | 'repaired_geometry';
  featureIndex: number;
  details: string;
}

export interface RepairAction {
  type: 'clean_coords' | 'rewind' | 'buffer_zero' | 'unkink';
  featureIndex: number;
  featureName: string;
}

// --- Deployment ---

export interface DeploymentManifest {
  version: string;
  files: Record<string, string>;
  metadata?: Record<string, ManifestMetadata> | undefined;
}

export interface ManifestMetadata {
  hash: string;
  size: number;
}

// --- Validation Report ---

export interface ValidationReport {
  runId: string;
  timestamp: string;
  totalYears: number;
  totalFeatures: number;
  totalErrors: number;
  totalWarnings: number;
  totalRepairs: number;
  yearSummaries: YearValidationSummary[];
}

export interface YearValidationSummary {
  year: number;
  featureCount: number;
  territoryCount: number;
  errors: number;
  warnings: number;
  repairs: number;
}
