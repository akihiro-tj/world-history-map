import { describe, expect, it } from 'vitest';
import { DEV_BUCKET } from './bucket-name.ts';
import { CloudflareApiCredentials } from './cloudflare-credentials.ts';

describe('CloudflareApiCredentials.fromEnv', () => {
  it('throws when both are missing', () => {
    expect(() => CloudflareApiCredentials.fromEnv({})).toThrow(
      'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
    );
  });

  it('throws when accountId is missing', () => {
    expect(() => CloudflareApiCredentials.fromEnv({ CLOUDFLARE_API_TOKEN: 'tok456' })).toThrow(
      'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
    );
  });

  it('throws when apiToken is missing', () => {
    expect(() => CloudflareApiCredentials.fromEnv({ CLOUDFLARE_ACCOUNT_ID: 'acc123' })).toThrow(
      'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required',
    );
  });
});

describe('CloudflareApiCredentials.authHeader', () => {
  it('returns Bearer authorization header', () => {
    const creds = CloudflareApiCredentials.fromEnv({
      CLOUDFLARE_ACCOUNT_ID: 'acc123',
      CLOUDFLARE_API_TOKEN: 'tok456',
    });
    expect(creds.authHeader()).toEqual({ Authorization: 'Bearer tok456' });
  });
});

describe('CloudflareApiCredentials.r2ListUrl', () => {
  const creds = CloudflareApiCredentials.fromEnv({
    CLOUDFLARE_ACCOUNT_ID: 'acc123',
    CLOUDFLARE_API_TOKEN: 'tok456',
  });

  it('includes account id and bucket name in the path', () => {
    const url = creds.r2ListUrl(DEV_BUCKET);
    expect(url.pathname).toContain('acc123');
    expect(url.pathname).toContain(DEV_BUCKET);
  });

  it('returns a URL without cursor param when cursor is not provided', () => {
    const url = creds.r2ListUrl(DEV_BUCKET);
    expect(url.searchParams.get('cursor')).toBeNull();
  });

  it('sets cursor search param when cursor is provided', () => {
    const url = creds.r2ListUrl(DEV_BUCKET, 'page2');
    expect(url.searchParams.get('cursor')).toBe('page2');
  });
});
