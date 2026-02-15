/**
 * File-based pipeline lock mechanism
 * Uses mkdir atomic operation + PID file + mtime stale detection
 */
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import path from 'node:path';
import { PATHS } from '@/pipeline/config.ts';

interface LockInfo {
  pid: number;
  hostname: string;
  startedAt: string;
}

/** Stale lock threshold: 5 minutes */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const INFO_FILE = 'info.json';

/**
 * Check if a process with the given PID is still running.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to acquire the pipeline lock.
 * Returns true if the lock was acquired, false if another process holds it.
 * Automatically cleans up stale locks.
 */
export function acquireLock(lockDir?: string): boolean {
  const lockPath = lockDir ?? PATHS.pipelineLock;
  const infoPath = path.join(lockPath, INFO_FILE);

  try {
    mkdirSync(lockPath, { recursive: false });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }

    // Lock directory exists - check if stale
    if (isLockStale(lockPath)) {
      // Clean up stale lock and retry
      rmSync(lockPath, { recursive: true, force: true });
      try {
        mkdirSync(lockPath, { recursive: false });
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }

  // Write lock info
  const info: LockInfo = {
    pid: process.pid,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
  };
  writeFileSync(infoPath, JSON.stringify(info, null, 2));

  return true;
}

/**
 * Release the pipeline lock.
 */
export function releaseLock(lockDir?: string): void {
  const lockPath = lockDir ?? PATHS.pipelineLock;
  rmSync(lockPath, { recursive: true, force: true });
}

/**
 * Check if the existing lock is stale.
 * A lock is stale if:
 * 1. The PID in info.json is no longer alive, OR
 * 2. The info.json mtime is older than the stale threshold (5 minutes)
 */
function isLockStale(lockPath: string): boolean {
  const infoPath = path.join(lockPath, INFO_FILE);

  try {
    const infoContent = readFileSync(infoPath, 'utf-8');
    const info = JSON.parse(infoContent) as LockInfo;
    const stat = statSync(infoPath);

    // Check if the process is still alive
    if (!isProcessAlive(info.pid)) {
      return true;
    }

    // Check mtime for stale detection
    const age = Date.now() - stat.mtimeMs;
    if (age > STALE_THRESHOLD_MS) {
      return true;
    }

    return false;
  } catch {
    // If we can't read the info file, assume stale
    return true;
  }
}

/**
 * Read lock info (if lock exists).
 */
export function readLockInfo(lockDir?: string): LockInfo | null {
  const lockPath = lockDir ?? PATHS.pipelineLock;
  const infoPath = path.join(lockPath, INFO_FILE);

  try {
    const content = readFileSync(infoPath, 'utf-8');
    return JSON.parse(content) as LockInfo;
  } catch {
    return null;
  }
}

/**
 * Register cleanup handlers to release lock on process exit.
 */
export function registerCleanupHandlers(lockDir?: string): void {
  const cleanup = (): void => {
    releaseLock(lockDir);
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
}
