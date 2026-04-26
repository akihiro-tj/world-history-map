import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';
import type { CloudflareApiCredentials } from './cloudflare-credentials.ts';

const execFileAsync = promisify(execFile);

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

export type ExecWrangler = (args: readonly string[], cwd: string) => Promise<string>;

export type FetchFn = typeof fetch;

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
  readonly #fetchFn: FetchFn;

  constructor(
    repoRoot: string,
    credentials: CloudflareApiCredentials,
    execWrangler?: ExecWrangler,
    fetchFn?: FetchFn,
  ) {
    this.#repoRoot = repoRoot;
    this.#credentials = credentials;
    this.#execWrangler = execWrangler ?? defaultExecWrangler;
    this.#fetchFn = fetchFn ?? defaultFetch;
  }

  async listObjects(bucket: BucketName): Promise<readonly HashedFilename[]> {
    const objectKeys = await this.#fetchAllObjectKeys(bucket);
    return HashedTileFilename.parseAll(objectKeys).map((tile) => tile.toString() as HashedFilename);
  }

  async #fetchAllObjectKeys(bucket: BucketName): Promise<readonly string[]> {
    const objectKeys: string[] = [];
    let nextPageCursor: string | undefined;

    do {
      const page = await this.#fetchObjectsPage(bucket, nextPageCursor);
      objectKeys.push(...page.keys);
      nextPageCursor = page.nextCursor;
    } while (nextPageCursor !== undefined);

    return objectKeys;
  }

  async #fetchObjectsPage(
    bucket: BucketName,
    cursor: string | undefined,
  ): Promise<{ readonly keys: readonly string[]; readonly nextCursor: string | undefined }> {
    const url = new URL(
      `${CLOUDFLARE_API_BASE_URL}/accounts/${this.#credentials.accountId}/r2/buckets/${bucket}/objects`,
    );
    if (cursor !== undefined) url.searchParams.set('cursor', cursor);

    const response = await this.#fetchFn(url, {
      headers: this.#credentials.authHeader(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list ${bucket}: ${response.status} ${response.statusText}`);
    }

    const listResponse = (await response.json()) as CloudflareR2ListResult;
    return {
      keys: listResponse.result.objects.map((r2Object) => r2Object.key),
      nextCursor: listResponse.result.truncated ? listResponse.result.cursor : undefined,
    };
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

function defaultFetch(...args: Parameters<FetchFn>): ReturnType<FetchFn> {
  return fetch(...args);
}
