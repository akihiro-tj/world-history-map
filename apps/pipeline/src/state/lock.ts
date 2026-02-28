import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import path from 'node:path';
import { PATHS } from '@/config.ts';

interface LockInfo {
  pid: number;
  hostname: string;
  startedAt: string;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const INFO_FILE = 'info.json';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(lockDir?: string): boolean {
  const lockPath = lockDir ?? PATHS.pipelineLock;
  const infoPath = path.join(lockPath, INFO_FILE);

  try {
    mkdirSync(path.dirname(lockPath), { recursive: true });
    mkdirSync(lockPath, { recursive: false });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }

    if (isLockStale(lockPath)) {
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

  const info: LockInfo = {
    pid: process.pid,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
  };
  writeFileSync(infoPath, JSON.stringify(info, null, 2));

  return true;
}

export function releaseLock(lockDir?: string): void {
  const lockPath = lockDir ?? PATHS.pipelineLock;
  rmSync(lockPath, { recursive: true, force: true });
}

function isLockStale(lockPath: string): boolean {
  const infoPath = path.join(lockPath, INFO_FILE);

  try {
    const infoContent = readFileSync(infoPath, 'utf-8');
    const info = JSON.parse(infoContent) as LockInfo;
    const stat = statSync(infoPath);

    if (!isProcessAlive(info.pid)) {
      return true;
    }

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
