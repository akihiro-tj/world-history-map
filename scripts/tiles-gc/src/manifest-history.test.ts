import { TilesManifest } from '@world-history-map/tiles';
import { describe, expect, it, vi } from 'vitest';
import { GitManifestHistoryRepository } from './manifest-history.ts';

const MANIFEST_CONTENT_TWO_YEARS = `export const manifest = {
  '1600': 'world_1600.aaa111bbb222.pmtiles',
  '1700': 'world_1700.ccc333ddd444.pmtiles',
} as const;
`;

const MANIFEST_CONTENT_ONE_YEAR = `export const manifest = {
  '1600': 'world_1600.eeefff000111.pmtiles',
} as const;
`;

describe('GitManifestHistoryRepository', () => {
  describe('recentSnapshots', () => {
    it('returns correct TilesManifest array from stubbed git output', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n789ghi012jkl\n';
        if (args[0] === 'show' && args[1]?.startsWith('abc123')) return MANIFEST_CONTENT_TWO_YEARS;
        if (args[0] === 'show' && args[1]?.startsWith('789ghi')) return MANIFEST_CONTENT_ONE_YEAR;
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      const snapshots = await repo.recentSnapshots(2);

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].availableYears()).toContain('1600');
      expect(snapshots[0].availableYears()).toContain('1700');
      expect(snapshots[1].availableYears()).toContain('1600');
      expect(snapshots[1].availableYears()).not.toContain('1700');
    });

    it('returns empty array when git log output is empty', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return '';
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      const snapshots = await repo.recentSnapshots(3);

      expect(snapshots).toHaveLength(0);
    });

    it('returns TilesManifest.empty() when git show returns empty content', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n';
        if (args[0] === 'show') return '';
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      const snapshots = await repo.recentSnapshots(1);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].equals(TilesManifest.empty())).toBe(true);
    });

    it('returns TilesManifest.empty() when git show fails for a commit', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n';
        if (args[0] === 'show') throw new Error('fatal: path not found');
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      const snapshots = await repo.recentSnapshots(1);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].equals(TilesManifest.empty())).toBe(true);
    });

    it('calls git log with -n 1 when windowSize is 1', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n';
        if (args[0] === 'show') return MANIFEST_CONTENT_ONE_YEAR;
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      await repo.recentSnapshots(1);

      const logCall = mockExecGit.mock.calls.find((call) => call[0][0] === 'log');
      expect(logCall).toBeDefined();
      expect(logCall?.[0]).toContain('-n');
      expect(logCall?.[0]).toContain('1');
    });

    it('passes the repo root as cwd to git commands', async () => {
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n';
        if (args[0] === 'show') return MANIFEST_CONTENT_ONE_YEAR;
        return '';
      });

      const repo = new GitManifestHistoryRepository('/my/repo/root', mockExecGit);
      await repo.recentSnapshots(1);

      for (const call of mockExecGit.mock.calls) {
        expect(call[1]).toBe('/my/repo/root');
      }
    });

    it('skips lines that do not contain a valid hashed filename', async () => {
      const contentWithInvalidLines = `export const manifest = {
  '1600': 'world_1600.aaa111bbb222.pmtiles',
  '1700': 'world_1700.notahash.pmtiles',
  '1800': 'world_1800.ccc333ddd444.pmtiles',
} as const;
`;
      const mockExecGit = vi.fn(async (args: readonly string[], _cwd: string): Promise<string> => {
        if (args[0] === 'log') return 'abc123def456\n';
        if (args[0] === 'show') return contentWithInvalidLines;
        return '';
      });

      const repo = new GitManifestHistoryRepository('/fake/root', mockExecGit);
      const snapshots = await repo.recentSnapshots(1);

      expect(snapshots[0]?.availableYears()).toContain('1600');
      expect(snapshots[0]?.availableYears()).toContain('1800');
      expect(snapshots[0]?.availableYears()).not.toContain('1700');
    });
  });
});
