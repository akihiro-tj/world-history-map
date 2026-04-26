import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HashedFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';

const execFileAsync = promisify(execFile);

export type ExecWrangler = (args: readonly string[], cwd: string) => Promise<string>;

export interface R2ObjectDeleter {
  delete(bucket: BucketName, key: HashedFilename): Promise<void>;
}

export class WranglerObjectDeleter implements R2ObjectDeleter {
  readonly #repoRoot: string;
  readonly #execWrangler: ExecWrangler;

  constructor(repoRoot: string, execWrangler?: ExecWrangler) {
    this.#repoRoot = repoRoot;
    this.#execWrangler = execWrangler ?? defaultExecWrangler;
  }

  async delete(bucket: BucketName, key: HashedFilename): Promise<void> {
    await this.#execWrangler(
      ['r2', 'object', 'delete', `${bucket}/${key}`, '--remote'],
      this.#repoRoot,
    );
  }
}

function defaultExecWrangler(args: readonly string[], cwd: string): Promise<string> {
  return execFileAsync('wrangler', [...args], { cwd }).then(({ stdout }) => stdout);
}
