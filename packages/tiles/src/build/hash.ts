import { createHash } from 'node:crypto';

const HASH_TRUNCATE_LENGTH = 12;

export function computeHash(data: Buffer | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function truncateHash(hash: string): string {
  return hash.slice(0, HASH_TRUNCATE_LENGTH);
}
