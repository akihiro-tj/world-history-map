import { describe, expect, it } from 'vitest';
import { CloudflareApiCredentials } from './cloudflare-credentials.ts';

describe('CloudflareApiCredentials.fromEnv', () => {
  it('creates credentials from env', () => {
    const creds = CloudflareApiCredentials.fromEnv({
      CLOUDFLARE_ACCOUNT_ID: 'acc123',
      CLOUDFLARE_API_TOKEN: 'tok456',
    });
    expect(creds.accountId).toBe('acc123');
    expect(creds.apiToken).toBe('tok456');
  });

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
