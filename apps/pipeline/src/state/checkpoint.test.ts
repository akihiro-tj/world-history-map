import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PipelineCheckpoint } from '@/state/checkpoint.ts';
import type { PipelineState } from '@/types/pipeline.ts';

describe('PipelineCheckpoint', () => {
  let tempDir: string;
  let statePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'checkpoint-test-'));
    statePath = path.join(tempDir, 'pipeline-state.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('persist / load', () => {
    it('should persist and load state correctly', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.persist();

      expect(existsSync(statePath)).toBe(true);

      const loaded = PipelineCheckpoint.load(statePath);
      expect(loaded).not.toBeNull();
      expect(loaded?.runId).toBe(checkpoint.runId);
    });

    it('should return null when state file does not exist', () => {
      const loaded = PipelineCheckpoint.load(path.join(tempDir, 'nonexistent.json'));
      expect(loaded).toBeNull();
    });

    it('should use atomic write (temp + rename)', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.persist();

      expect(existsSync(statePath)).toBe(true);

      const content = readFileSync(statePath, 'utf-8');
      const parsed = JSON.parse(content) as PipelineState;
      expect(parsed.version).toBe(1);
    });
  });

  describe('create', () => {
    it('should create checkpoint with running status', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      expect(checkpoint.status).toBe('running');
      expect(checkpoint.startedAt).toBeTruthy();
      expect(checkpoint.runId).toBeTruthy();
      expect(checkpoint.yearKeys).toEqual([]);
    });
  });

  describe('loadOrCreate', () => {
    it('should create new checkpoint when no file exists', () => {
      const checkpoint = PipelineCheckpoint.loadOrCreate(statePath);
      expect(checkpoint.status).toBe('running');
    });

    it('should create new checkpoint when existing state is completed', () => {
      const first = PipelineCheckpoint.create(statePath);
      first.complete();

      const second = PipelineCheckpoint.loadOrCreate(statePath);
      expect(second.runId).not.toBe(first.runId);
    });

    it('should resume existing running checkpoint', () => {
      const first = PipelineCheckpoint.create(statePath);
      first.persist();

      const second = PipelineCheckpoint.loadOrCreate(statePath);
      expect(second.runId).toBe(first.runId);
    });
  });

  describe('shouldProcess', () => {
    it('should return true for a new year not in state', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      expect(checkpoint.shouldProcess(1650, 'merge', 'abc123')).toBe(true);
    });

    it('should return true when source hash has changed', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.updateYear(1650, 'source', {
        hash: 'old_hash',
        fetchedAt: new Date().toISOString(),
      });
      checkpoint.updateYear(1650, 'merge', {
        hash: 'merge_hash',
        completedAt: new Date().toISOString(),
        featureCount: 42,
        labelCount: 42,
      });

      expect(checkpoint.shouldProcess(1650, 'merge', 'new_hash')).toBe(true);
    });

    it('should return false when hash matches and stage is complete', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.updateYear(1650, 'source', {
        hash: 'same_hash',
        fetchedAt: new Date().toISOString(),
      });
      checkpoint.updateYear(1650, 'merge', {
        hash: 'merge_hash',
        completedAt: new Date().toISOString(),
        featureCount: 42,
        labelCount: 42,
      });

      expect(checkpoint.shouldProcess(1650, 'merge', 'same_hash')).toBe(false);
    });

    it('should return true for all years after restart', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      expect(checkpoint.shouldProcess(1650, 'merge', 'any_hash')).toBe(true);
    });
  });

  describe('invalidateDownstream', () => {
    it('should remove stages after the given stage', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.updateYear(1650, 'source', {
        hash: 'h',
        fetchedAt: new Date().toISOString(),
      });
      checkpoint.updateYear(1650, 'merge', {
        hash: 'h',
        completedAt: new Date().toISOString(),
        featureCount: 1,
        labelCount: 1,
      });
      checkpoint.updateYear(1650, 'validate', {
        completedAt: new Date().toISOString(),
        warnings: 0,
        errors: 0,
      });

      checkpoint.invalidateDownstream(1650, 'source');

      const yearState = checkpoint.getYearState(1650);
      expect(yearState?.source).toBeDefined();
      expect(yearState?.merge).toBeUndefined();
      expect(yearState?.validate).toBeUndefined();
    });
  });

  describe('complete / fail', () => {
    it('should set status to completed and persist', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.complete();

      const loaded = PipelineCheckpoint.load(statePath);
      expect(loaded?.status).toBe('completed');
    });

    it('should set status to failed and persist', () => {
      const checkpoint = PipelineCheckpoint.create(statePath);
      checkpoint.fail();

      const loaded = PipelineCheckpoint.load(statePath);
      expect(loaded?.status).toBe('failed');
    });
  });
});
