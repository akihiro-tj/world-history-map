import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireLock, readLockInfo, releaseLock } from '@/state/lock.ts';

describe('pipeline lock', () => {
  let tempDir: string;
  let lockDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'lock-test-'));
    lockDir = path.join(tempDir, 'pipeline.lock');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('acquireLock', () => {
    it('should acquire lock when no lock exists', () => {
      const result = acquireLock(lockDir);

      expect(result).toBe(true);
      expect(existsSync(lockDir)).toBe(true);
    });

    it('should write lock info with PID and hostname', () => {
      acquireLock(lockDir);

      const info = readLockInfo(lockDir);
      expect(info).not.toBeNull();
      expect(info?.pid).toBe(process.pid);
      expect(info?.hostname).toBeTruthy();
      expect(info?.startedAt).toBeTruthy();
    });

    it('should reject when lock is already held by current process', () => {
      acquireLock(lockDir);
      const result = acquireLock(lockDir);

      // Current process is still alive, so lock should be rejected
      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should remove lock directory', () => {
      acquireLock(lockDir);
      expect(existsSync(lockDir)).toBe(true);

      releaseLock(lockDir);
      expect(existsSync(lockDir)).toBe(false);
    });

    it('should not throw if lock does not exist', () => {
      expect(() => releaseLock(lockDir)).not.toThrow();
    });
  });

  describe('stale lock detection', () => {
    it('should detect stale lock with dead PID', () => {
      mkdirSync(lockDir, { recursive: true });
      const infoPath = path.join(lockDir, 'info.json');
      writeFileSync(
        infoPath,
        JSON.stringify({
          pid: 999999999, // very unlikely to exist
          hostname: 'test',
          startedAt: new Date().toISOString(),
        }),
      );

      // Should acquire since the PID is dead
      const result = acquireLock(lockDir);
      expect(result).toBe(true);
    });

    it('should detect stale lock with old mtime', () => {
      mkdirSync(lockDir, { recursive: true });
      const infoPath = path.join(lockDir, 'info.json');
      // Write info with a PID that is definitely not alive (0 is special)
      writeFileSync(
        infoPath,
        JSON.stringify({
          pid: 999999998,
          hostname: 'test',
          startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        }),
      );

      const result = acquireLock(lockDir);
      expect(result).toBe(true);
    });
  });
});
