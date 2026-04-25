import { describe, expect, it } from 'vitest';
import { computeHash, truncateHash } from '../src/build/hash.ts';

describe('computeHash', () => {
  it('returns same hash for same input', () => {
    const buf = Buffer.from('deterministic-input');
    expect(computeHash(buf)).toBe(computeHash(buf));
  });

  it('returns different hashes for different inputs', () => {
    expect(computeHash(Buffer.from('aaa'))).not.toBe(computeHash(Buffer.from('bbb')));
  });

  it('returns 64-character lowercase hex string (SHA-256)', () => {
    const hash = computeHash(Buffer.from('test-content'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts Uint8Array as input', () => {
    const arr = new Uint8Array([0x41, 0x42, 0x43]);
    expect(computeHash(arr)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same result for Buffer and equivalent Uint8Array', () => {
    const bytes = [0x01, 0x02, 0x03];
    expect(computeHash(Buffer.from(bytes))).toBe(computeHash(new Uint8Array(bytes)));
  });
});

describe('truncateHash', () => {
  it('returns the first 12 characters', () => {
    const full = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(truncateHash(full)).toBe('abcdef012345');
  });

  it('returned value is always 12 characters', () => {
    const full = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(truncateHash(full)).toHaveLength(12);
  });
});
