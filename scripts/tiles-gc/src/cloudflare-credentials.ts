import type { BucketName } from './bucket-name.ts';

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

export class CloudflareApiCredentials {
  readonly #accountId: string;
  readonly #apiToken: string;

  private constructor(accountId: string, apiToken: string) {
    this.#accountId = accountId;
    this.#apiToken = apiToken;
  }

  static fromEnv(env: NodeJS.ProcessEnv): CloudflareApiCredentials {
    const accountId = env['CLOUDFLARE_ACCOUNT_ID'];
    const apiToken = env['CLOUDFLARE_API_TOKEN'];
    if (!accountId || !apiToken) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required');
    }
    return new CloudflareApiCredentials(accountId, apiToken);
  }

  authHeader(): Readonly<Record<string, string>> {
    return { Authorization: `Bearer ${this.#apiToken}` };
  }

  r2ListUrl(bucket: BucketName, cursor?: string): URL {
    const url = new URL(
      `${CLOUDFLARE_API_BASE_URL}/accounts/${this.#accountId}/r2/buckets/${bucket}/objects`,
    );
    if (cursor !== undefined) url.searchParams.set('cursor', cursor);
    return url;
  }
}
