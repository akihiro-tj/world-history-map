import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';
import { z } from 'zod';
import type { BucketName } from './bucket-name.ts';
import type { CloudflareApiCredentials } from './cloudflare-credentials.ts';

export type FetchFn = typeof fetch;

const CloudflareR2ListResultSchema = z
  .object({
    result: z.object({
      objects: z.array(z.object({ key: z.string() })),
      truncated: z.boolean(),
      cursor: z.string().optional(),
    }),
  })
  .transform((data) => ({
    keys: data.result.objects.map((o) => o.key),
    nextCursor: data.result.truncated ? data.result.cursor : undefined,
  }));

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
    const url = this.#credentials.r2ListUrl(bucket, cursor);
    const response = await this.#fetchFn(url, { headers: this.#credentials.authHeader() });
    ensureOk(response, bucket);
    return parseListResult(await response.json());
  }
}

function ensureOk(response: Response, bucket: BucketName): void {
  if (!response.ok) {
    throw new Error(`Failed to list ${bucket}: ${response.status} ${response.statusText}`);
  }
}

function parseListResult(json: unknown): {
  readonly keys: readonly string[];
  readonly nextCursor: string | undefined;
} {
  const parsed = CloudflareR2ListResultSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Failed to parse R2 list response: ${parsed.error.message}`);
  }
  return parsed.data;
}

function defaultFetch(...args: Parameters<FetchFn>): ReturnType<FetchFn> {
  return fetch(...args);
}
