import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  validateAllDescriptions,
  validateDescriptionFile,
} from '@/stages/validate-descriptions.ts';

describe('validate-descriptions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'validate-desc-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('validateDescriptionFile', () => {
    it('should pass a complete valid entry', async () => {
      const data = {
        france: {
          name: 'フランス王国',
          era: '絶対王政期',
          profile: {
            capital: 'パリ',
            regime: '絶対王政',
            dynasty: 'ブルボン朝',
            leader: 'ルイ14世',
            religion: 'カトリック',
          },
          context:
            '1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。',
          keyEvents: [
            { year: 1643, event: 'ルイ14世即位' },
            { year: 1789, event: 'フランス革命' },
          ],
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass a minimal valid entry with name only', async () => {
      const data = {
        ethiopia: {
          name: 'エチオピア帝国',
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject entry with "不明" in any field', async () => {
      const data = {
        france: {
          name: 'フランス王国',
          profile: { capital: '不明' },
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty string fields', async () => {
      const data = {
        france: {
          name: '',
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject context outside 50-200 character range', async () => {
      const tooShort = {
        france: {
          name: 'フランス王国',
          context: '短すぎるコンテキスト',
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(tooShort));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject unsorted keyEvents', async () => {
      const data = {
        france: {
          name: 'フランス王国',
          keyEvents: [
            { year: 1789, event: 'フランス革命' },
            { year: 1643, event: 'ルイ14世即位' },
          ],
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty profile object', async () => {
      const data = {
        france: {
          name: 'フランス王国',
          profile: {},
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty keyEvents array', async () => {
      const data = {
        france: {
          name: 'フランス王国',
          keyEvents: [],
        },
      };
      const filePath = path.join(tempDir, '1700.json');
      await writeFile(filePath, JSON.stringify(data));

      const result = validateDescriptionFile(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateAllDescriptions', () => {
    it('should validate all JSON files in a directory', async () => {
      const valid = {
        france: { name: 'フランス王国' },
      };
      const invalid = {
        france: { name: '' },
      };
      await writeFile(path.join(tempDir, '1700.json'), JSON.stringify(valid));
      await writeFile(path.join(tempDir, '1800.json'), JSON.stringify(invalid));

      const results = await validateAllDescriptions(tempDir);

      expect(results).toHaveLength(2);
      const passed = results.filter((r) => r.valid);
      const failed = results.filter((r) => !r.valid);
      expect(passed).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });

    it('should ignore non-JSON files', async () => {
      await writeFile(path.join(tempDir, 'readme.txt'), 'not json');
      const valid = { france: { name: 'フランス王国' } };
      await writeFile(path.join(tempDir, '1700.json'), JSON.stringify(valid));

      const results = await validateAllDescriptions(tempDir);

      expect(results).toHaveLength(1);
    });
  });
});
