import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';
import type { CloudflareApiCredentials } from './cloudflare-credentials.ts';

const execFileAsync = promisify(execFile);

export type ExecWrangler = (args: readonly string[], cwd: string) => Promise<string>;

interface CloudflareR2Object {
  readonly key: string;
}

interface CloudflareR2ListResult {
  readonly result: {
    readonly objects: readonly CloudflareR2Object[];
    readonly truncated: boolean;
    readonly cursor?: string;
  };
}

export interface R2BucketRepository {
  listObjects(bucket: BucketName): Promise<readonly HashedFilename[]>;
  deleteObject(bucket: BucketName, key: HashedFilename): Promise<void>;
}

export class WranglerR2BucketRepository implements R2BucketRepository {
  readonly #repoRoot: string;
  readonly #credentials: CloudflareApiCredentials;
  readonly #execWrangler: ExecWrangler;

  constructor(
    repoRoot: string,
    credentials: CloudflareApiCredentials,
    execWrangler?: ExecWrangler,
  ) {
    this.#repoRoot = repoRoot;
    this.#credentials = credentials;
    this.#execWrangler = execWrangler ?? defaultExecWrangler;
  }

  async listObjects(bucket: BucketName): Promise<readonly HashedFilename[]> {
    const keys: string[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(
        `https://api.cloudflare.com/client/v4/accounts/${this.#credentials.accountId}/r2/buckets/${bucket}/objects`,
      );
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url, {
        headers: this.#credentials.authHeader(),
      });

      if (!response.ok) {
        throw new Error(`Failed to list ${bucket}: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as CloudflareR2ListResult;
      keys.push(...data.result.objects.map((o) => o.key));
      cursor = data.result.truncated ? data.result.cursor : undefined;
    } while (cursor !== undefined);

    return keys.flatMap((key) => {
      const tile = HashedTileFilename.parseHashed(key);
      return tile !== null ? [tile.toString() as HashedFilename] : [];
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
