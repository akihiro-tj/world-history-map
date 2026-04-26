import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HashedTileFilename, TilesManifest } from '@world-history-map/tiles';

const execFileAsync = promisify(execFile);

export const MANIFEST_PATH = 'packages/tiles/src/manifest.ts' as const;

export type ExecGit = (args: readonly string[], cwd: string) => Promise<string>;

export interface ManifestHistoryRepository {
  recentSnapshots(windowSize: number): Promise<readonly TilesManifest[]>;
}

export class GitManifestHistoryRepository implements ManifestHistoryRepository {
  readonly #repoRoot: string;
  readonly #execGit: ExecGit;

  constructor(repoRoot: string, execGit?: ExecGit) {
    this.#repoRoot = repoRoot;
    this.#execGit = execGit ?? defaultExecGit;
  }

  async recentSnapshots(windowSize: number): Promise<readonly TilesManifest[]> {
    const logOutput = await this.#execGit(
      ['log', `-n`, String(windowSize), '--format=%H', '--', MANIFEST_PATH],
      this.#repoRoot,
    );
    const commits = logOutput.trim().split('\n').filter(Boolean);
    if (commits.length === 0) return [];
    return Promise.all(commits.map((hash) => this.#snapshotForCommit(hash)));
  }

  async #snapshotForCommit(commitHash: string): Promise<TilesManifest> {
    try {
      const content = await this.#execGit(
        ['show', `${commitHash}:${MANIFEST_PATH}`],
        this.#repoRoot,
      );
      return parseManifestContent(content);
    } catch {
      return TilesManifest.empty();
    }
  }
}

function parseManifestContent(content: string): TilesManifest {
  const entries: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const filenameMatch = /'(world_[^']+\.pmtiles)'/.exec(line);
    if (!filenameMatch?.[1]) continue;
    const parsed = HashedTileFilename.parseHashed(filenameMatch[1]);
    if (parsed) {
      entries[parsed.year] = parsed.toString();
    }
  }
  return TilesManifest.fromRecord(entries);
}

function defaultExecGit(args: readonly string[], cwd: string): Promise<string> {
  return execFileAsync('git', [...args], { cwd }).then(({ stdout }) => stdout);
}
