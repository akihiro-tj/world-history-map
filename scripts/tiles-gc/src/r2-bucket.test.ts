import { describe, expect, it, vi } from 'vitest';
import { DEV_BUCKET } from './bucket-name.ts';
import { CloudflareApiCredentials } from './cloudflare-credentials.ts';
import type { FetchFn } from './r2-bucket.ts';
import { WranglerR2BucketRepository } from './r2-bucket.ts';

const TEST_CREDENTIALS = CloudflareApiCredentials.fromEnv({
  CLOUDFLARE_ACCOUNT_ID: 'test-account',
  CLOUDFLARE_API_TOKEN: 'test-token',
});

function makeListResponse(keys: string[], truncated: boolean, cursor?: string): Response {
  return new Response(
    JSON.stringify({ result: { objects: keys.map((key) => ({ key })), truncated, cursor } }),
    { status: 200 },
  );
}

describe('WranglerR2BucketRepository', () => {
  describe('listObjects', () => {
    it('returns hashed tile filenames from a single page', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(
          makeListResponse(
            ['world_1600.fedcba987654.pmtiles', 'world_1700.aabbcc112233.pmtiles', 'readme.txt'],
            false,
          ),
        );

      const repo = new WranglerR2BucketRepository('/', TEST_CREDENTIALS, undefined, mockFetch);
      const result = await repo.listObjects(DEV_BUCKET);

      expect(result).toHaveLength(2);
      expect(result).toContain('world_1600.fedcba987654.pmtiles');
      expect(result).toContain('world_1700.aabbcc112233.pmtiles');
    });

    it('iterates through multiple pages using cursor', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValueOnce(
          makeListResponse(['world_1600.fedcba987654.pmtiles'], true, 'cursor-abc'),
        )
        .mockResolvedValueOnce(makeListResponse(['world_1700.aabbcc112233.pmtiles'], false));

      const repo = new WranglerR2BucketRepository('/', TEST_CREDENTIALS, undefined, mockFetch);
      const result = await repo.listObjects(DEV_BUCKET);

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const secondCallUrl = mockFetch.mock.calls[1]?.[0] as URL;
      expect(secondCallUrl.searchParams.get('cursor')).toBe('cursor-abc');
    });

    it('excludes keys that do not match the hashed tile pattern', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(makeListResponse(['readme.txt', 'world_1600.pmtiles'], false));

      const repo = new WranglerR2BucketRepository('/', TEST_CREDENTIALS, undefined, mockFetch);
      const result = await repo.listObjects(DEV_BUCKET);

      expect(result).toHaveLength(0);
    });

    it('throws when the API returns a non-ok status', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(new Response(null, { status: 403, statusText: 'Forbidden' }));

      const repo = new WranglerR2BucketRepository('/', TEST_CREDENTIALS, undefined, mockFetch);
      await expect(repo.listObjects(DEV_BUCKET)).rejects.toThrow(
        `Failed to list ${DEV_BUCKET}: 403 Forbidden`,
      );
    });
  });
});
