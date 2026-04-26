import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';

const execFileAsync = promisify(execFile);

export type ExecWrangler = (args: readonly string[], cwd: string) => Promise<string>;

export interface R2BucketRepository {
  listObjects(bucket: BucketName): Promise<readonly HashedFilename[]>;
  deleteObject(bucket: BucketName, key: HashedFilename): Promise<void>;
}

export class WranglerR2BucketRepository implements R2BucketRepository {
  readonly #repoRoot: string;
  readonly #execWrangler: ExecWrangler;

  constructor(repoRoot: string, execWrangler?: ExecWrangler) {
    this.#repoRoot = repoRoot;
    this.#execWrangler = execWrangler ?? defaultExecWrangler;
  }

  async listObjects(bucket: BucketName): Promise<readonly HashedFilename[]> {
    const output = await this.#execWrangler(
      ['r2', 'object', 'list', bucket, '--remote', '--json'],
      this.#repoRoot,
    );
    const parsed = JSON.parse(output) as { key: string }[];
    return parsed.flatMap((entry) => {
      const tile = HashedTileFilename.parseHashed(entry.key);
      return tile !== null ? [tile.toString()] : [];
    });
  }

  async deleteObject(bucket: BucketName, key: HashedFilename): Promise<void> {
    await this.#execWrangler(
      ['r2', 'object', 'delete', `${bucket}/${key}`, '--remote'],
      this.#repoRoot,
    );
  }
}

function defaultExecWrangler(args: readonly string[], cwd: string): Promise<string> {
  return execFileAsync('wrangler', [...args], { cwd }).then(({ stdout }) => stdout);
}
