import { describe, expect, it, vi } from 'vitest';
import { DEV_BUCKET } from './bucket-name.ts';
import { CloudflareApiCredentials } from './cloudflare-credentials.ts';
import type { FetchFn } from './r2-object-lister.ts';
import { CloudflareApiObjectLister } from './r2-object-lister.ts';

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

describe('CloudflareApiObjectLister', () => {
  describe('list', () => {
    it('returns all object keys from a single page', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(
          makeListResponse(
            ['world_1600.fedcba987654.pmtiles', 'world_1700.aabbcc112233.pmtiles', 'readme.txt'],
            false,
          ),
        );

      const lister = new CloudflareApiObjectLister(TEST_CREDENTIALS, mockFetch);
      const result = await lister.list(DEV_BUCKET);

      expect(result).toHaveLength(3);
      expect(result).toContain('world_1600.fedcba987654.pmtiles');
      expect(result).toContain('world_1700.aabbcc112233.pmtiles');
      expect(result).toContain('readme.txt');
    });

    it('iterates through multiple pages using cursor', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValueOnce(
          makeListResponse(['world_1600.fedcba987654.pmtiles'], true, 'cursor-abc'),
        )
        .mockResolvedValueOnce(makeListResponse(['world_1700.aabbcc112233.pmtiles'], false));

      const lister = new CloudflareApiObjectLister(TEST_CREDENTIALS, mockFetch);
      const result = await lister.list(DEV_BUCKET);

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const secondCallUrl = mockFetch.mock.calls[1]?.[0] as URL;
      expect(secondCallUrl.searchParams.get('cursor')).toBe('cursor-abc');
    });

    it('throws when the API returns a non-ok status', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(new Response(null, { status: 403, statusText: 'Forbidden' }));

      const lister = new CloudflareApiObjectLister(TEST_CREDENTIALS, mockFetch);
      await expect(lister.list(DEV_BUCKET)).rejects.toThrow(
        `Failed to list ${DEV_BUCKET}: 403 Forbidden`,
      );
    });

    it('throws when the response body does not match the expected schema', async () => {
      const mockFetch = vi
        .fn<FetchFn>()
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      const lister = new CloudflareApiObjectLister(TEST_CREDENTIALS, mockFetch);
      await expect(lister.list(DEV_BUCKET)).rejects.toThrow('Failed to parse R2 list response');
    });

    it('throws when objects field is not an array', async () => {
      const mockFetch = vi.fn<FetchFn>().mockResolvedValue(
        new Response(JSON.stringify({ result: { objects: 'not-an-array', truncated: false } }), {
          status: 200,
        }),
      );

      const lister = new CloudflareApiObjectLister(TEST_CREDENTIALS, mockFetch);
      await expect(lister.list(DEV_BUCKET)).rejects.toThrow('Failed to parse R2 list response');
    });
  });
});
