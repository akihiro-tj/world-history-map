/**
 * Checkpoint persistence for pipeline state
 * Uses atomic write (temp + rename) for crash safety
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { PipelineState, YearState } from '@/types/pipeline.ts';

type YearStageKey = keyof YearState;

/**
 * Create a fresh initial pipeline state.
 */
export function createInitialState(): PipelineState {
  const now = new Date().toISOString();
  const suffix = randomBytes(2).toString('hex');
  return {
    version: 1,
    runId: `${now}-${suffix}`,
    startedAt: now,
    completedAt: null,
    status: 'running',
    stages: {},
    years: {},
  };
}

/**
 * Save pipeline state to a JSON file using atomic write.
 * Writes to a temp file first, then renames to ensure crash safety.
 */
export function saveState(state: PipelineState, filePath: string): void {
  const tempPath = `${filePath}.tmp.${process.pid}`;
  writeFileSync(tempPath, JSON.stringify(state, null, 2));
  renameSync(tempPath, filePath);
}

/**
 * Load pipeline state from a JSON file.
 * Returns null if the file does not exist or is invalid.
 */
export function loadState(filePath: string): PipelineState | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as PipelineState;
  } catch {
    return null;
  }
}

/**
 * Determine whether a year+stage needs reprocessing.
 * Returns true if:
 * - The year has no state entry
 * - The source hash has changed
 * - The specified stage is not yet completed
 */
export function shouldProcessYear(
  state: PipelineState,
  year: number,
  stage: YearStageKey,
  sourceHash: string,
): boolean {
  const yearKey = String(year);
  const yearState = state.years[yearKey];

  // Year not in state → needs processing
  if (!yearState) {
    return true;
  }

  // Source hash changed → downstream stages need reprocessing
  if (yearState.source && yearState.source.hash !== sourceHash) {
    return true;
  }

  // Stage not yet completed → needs processing
  if (!yearState[stage]) {
    return true;
  }

  return false;
}

/**
 * Update a year's state for a specific stage.
 */
export function updateYearState(
  state: PipelineState,
  year: number,
  stage: YearStageKey,
  data: NonNullable<YearState[typeof stage]>,
): void {
  const yearKey = String(year);
  if (!state.years[yearKey]) {
    state.years[yearKey] = {};
  }
  const yearState = state.years[yearKey];
  if (yearState) {
    // Type assertion needed due to discriminated union of stage keys
    (yearState[stage] as NonNullable<YearState[typeof stage]>) = data;
  }
}

/**
 * Invalidate all downstream stages for a year when source changes.
 */
export function invalidateDownstream(
  state: PipelineState,
  year: number,
  fromStage: YearStageKey,
): void {
  const yearKey = String(year);
  const yearState = state.years[yearKey];
  if (!yearState) return;

  const stageOrder: YearStageKey[] = [
    'source',
    'merge',
    'validate',
    'convert',
    'prepare',
    'upload',
  ];
  const fromIndex = stageOrder.indexOf(fromStage);

  for (let i = fromIndex + 1; i < stageOrder.length; i++) {
    const key = stageOrder[i];
    if (key) {
      delete yearState[key];
    }
  }
}

/**
 * Get the state file path (with optional override for testing).
 */
export function getStatePath(override?: string): string {
  return override ?? path.join(process.cwd(), '.cache', 'pipeline-state.json');
}
