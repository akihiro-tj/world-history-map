import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import type { BucketName } from './bucket-name.ts';
import type { CloudflareApiCredentials } from './cloudflare-credentials.ts';

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

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

export interface R2ObjectLister {
  list(bucket: BucketName): Promise<readonly HashedFilename[]>;
}

export class CloudflareApiObjectLister implements R2ObjectLister {
  readonly #credentials: CloudflareApiCredentials;
  readonly #fetchFn: FetchFn;

  constructor(credentials: CloudflareApiCredentials, fetchFn?: FetchFn) {
    this.#credentials = credentials;
    this.#fetchFn = fetchFn ?? defaultFetch;
  }

  async list(bucket: BucketName): Promise<readonly HashedFilename[]> {
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
}

function defaultFetch(...args: Parameters<FetchFn>): ReturnType<FetchFn> {
  return fetch(...args);
}
