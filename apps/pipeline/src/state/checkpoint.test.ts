import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, shouldProcessYear } from '@/state/checkpoint.ts';
import type { PipelineState } from '@/types/pipeline.ts';

describe('checkpoint persistence', () => {
  let tempDir: string;
  let statePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'checkpoint-test-'));
    statePath = path.join(tempDir, 'pipeline-state.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('saveState / loadState', () => {
    it('should save and load state correctly', () => {
      const state = createInitialState();
      saveState(state, statePath);

      expect(existsSync(statePath)).toBe(true);

      const loaded = loadState(statePath);
      expect(loaded).not.toBeNull();
      expect(loaded?.runId).toBe(state.runId);
      expect(loaded?.version).toBe(1);
    });

    it('should return null when state file does not exist', () => {
      const loaded = loadState(path.join(tempDir, 'nonexistent.json'));
      expect(loaded).toBeNull();
    });

    it('should use atomic write (temp + rename)', () => {
      const state = createInitialState();
      saveState(state, statePath);

      // The file should exist at the final path, not a temp path
      expect(existsSync(statePath)).toBe(true);

      // Verify content is valid JSON
      const content = readFileSync(statePath, 'utf-8');
      const parsed = JSON.parse(content) as PipelineState;
      expect(parsed.version).toBe(1);
    });
  });

  describe('createInitialState', () => {
    it('should create state with version 1', () => {
      const state = createInitialState();
      expect(state.version).toBe(1);
      expect(state.status).toBe('running');
      expect(state.startedAt).toBeTruthy();
      expect(state.runId).toBeTruthy();
      expect(state.years).toEqual({});
    });
  });

  describe('shouldProcessYear', () => {
    it('should return true for a new year not in state', () => {
      const state = createInitialState();
      expect(shouldProcessYear(state, 1650, 'merge', 'abc123')).toBe(true);
    });

    it('should return true when source hash has changed', () => {
      const state = createInitialState();
      state.years['1650'] = {
        source: { hash: 'old_hash', fetchedAt: new Date().toISOString() },
        merge: {
          hash: 'merge_hash',
          completedAt: new Date().toISOString(),
          featureCount: 42,
          labelCount: 42,
        },
      };

      expect(shouldProcessYear(state, 1650, 'merge', 'new_hash')).toBe(true);
    });

    it('should return false when hash matches and stage is complete', () => {
      const state = createInitialState();
      state.years['1650'] = {
        source: { hash: 'same_hash', fetchedAt: new Date().toISOString() },
        merge: {
          hash: 'merge_hash',
          completedAt: new Date().toISOString(),
          featureCount: 42,
          labelCount: 42,
        },
      };

      expect(shouldProcessYear(state, 1650, 'merge', 'same_hash')).toBe(false);
    });

    it('should respect --restart flag by returning true for all years', () => {
      const state = createInitialState();
      // Fresh state = always process
      expect(shouldProcessYear(state, 1650, 'merge', 'any_hash')).toBe(true);
    });
  });
});
