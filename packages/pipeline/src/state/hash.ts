/**
 * SHA-256 streaming hash utility
 * Uses node:crypto for content-based change detection
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Calculate SHA-256 hash of a file using streaming (memory-efficient).
 * Returns the full 64-character hex string.
 */
export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Calculate SHA-256 hash of a string/buffer.
 */
export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Extract first 8 hex characters from a full SHA-256 hash.
 */
export function hash8(fullHash: string): string {
  return fullHash.slice(0, 8);
}
