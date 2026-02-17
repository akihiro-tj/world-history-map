import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hash8, hashContent, hashFile } from '@/state/hash.ts';

describe('hash utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'hash-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('hashFile', () => {
    it('should produce a valid 64-char hex SHA-256 hash', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await writeFile(filePath, 'hello world');

      const result = await hashFile(filePath);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      // Known SHA-256 of "hello world"
      expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should hash an empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      await writeFile(filePath, '');

      const result = await hashFile(filePath);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      // Known SHA-256 of empty string
      expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle large files via streaming', async () => {
      const filePath = path.join(tempDir, 'large.bin');
      // 1MB of data
      const data = Buffer.alloc(1024 * 1024, 0x42);
      await writeFile(filePath, data);

      const result = await hashFile(filePath);

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      // Same content should always produce same hash
      const result2 = await hashFile(filePath);
      expect(result).toBe(result2);
    });

    it('should reject on non-existent file', async () => {
      await expect(hashFile(path.join(tempDir, 'nonexistent'))).rejects.toThrow();
    });
  });

  describe('hashContent', () => {
    it('should hash a string', () => {
      const result = hashContent('hello world');
      expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('should hash a Buffer', () => {
      const result = hashContent(Buffer.from('hello world'));
      expect(result).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });
  });

  describe('hash8', () => {
    it('should extract first 8 characters', () => {
      const full = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(hash8(full)).toBe('b94d27b9');
    });
  });
});
