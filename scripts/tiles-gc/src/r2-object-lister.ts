import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import { z } from 'zod';
import type { BucketName } from './bucket-name.ts';
import type { CloudflareApiCredentials } from './cloudflare-credentials.ts';

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

export type FetchFn = typeof fetch;

const CloudflareR2ListResultSchema = z.object({
  result: z.object({
    objects: z.array(z.object({ key: z.string() })),
    truncated: z.boolean(),
    cursor: z.string().optional(),
  }),
});

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
    return HashedTileFilename.parseAll(objectKeys).map((tile) => tile.toString());
  }

  async #fetchAllObjectKeys(bucket: BucketName): Promise<readonly string[]> {
    const objectKeys: string[] = [];
    let cursor: string | undefined;

    while (true) {
      const page = await this.#fetchObjectsPage(bucket, cursor);
      objectKeys.push(...page.keys);
      if (page.nextCursor === undefined) break;
      cursor = page.nextCursor;
    }

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

    const parsed = CloudflareR2ListResultSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(`Failed to parse R2 list response: ${parsed.error.message}`);
    }
    return {
      keys: parsed.data.result.objects.map((r2Object) => r2Object.key),
      nextCursor: parsed.data.result.truncated ? parsed.data.result.cursor : undefined,
    };
  }
}

function defaultFetch(...args: Parameters<FetchFn>): ReturnType<FetchFn> {
  return fetch(...args);
}
