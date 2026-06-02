import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type TerritoryIdResolver, validateEraSummaryFile } from '@/era-summary/validate.ts';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'era-summary-validate-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function writeSummary(summary: unknown): string {
  const filePath = path.join(workDir, 'summary.json');
  writeFileSync(filePath, JSON.stringify(summary));
  return filePath;
}

const resolveFranceOnly: TerritoryIdResolver = (year) =>
  year === 1650 ? new Set(['france']) : null;

describe('validateEraSummaryFile', () => {
  it('accepts a well-formed summary whose references resolve', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'ヨーロッパ',
          context: 'フランスで絶対王政が確立しつつあった。',
          references: [{ kind: 'territory', target: 'France', text: 'フランス' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a reference whose text is absent from the context', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'ヨーロッパ',
          context: '絶対王政が確立しつつあった。',
          references: [{ kind: 'territory', target: 'France', text: 'フランス' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/does not appear in context/);
  });

  it('rejects a territory reference that is not a territory at the year', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'east-asia',
          title: '東アジア',
          context: '日本では江戸幕府が鎖国体制を確立した。',
          references: [{ kind: 'territory', target: 'Japan', text: '日本' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/is not a territory at year 1650/);
  });

  it('resolves a NAME target with spaces and lowercase words by kebab-casing', () => {
    const resolveMuscovy: TerritoryIdResolver = (year) =>
      year === 1650 ? new Set(['tsardom-of-muscovy']) : null;
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'ヨーロッパ',
          context: 'ロシアでロマノフ朝が成立した。',
          references: [{ kind: 'territory', target: 'Tsardom of Muscovy', text: 'ロシア' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveMuscovy);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('skips territory resolution when no resolver is provided', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'east-asia',
          title: '東アジア',
          context: '日本では江戸幕府が鎖国体制を確立した。',
          references: [{ kind: 'territory', target: 'Japan', text: '日本' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath);

    expect(result.valid).toBe(true);
  });

  it('reports structural errors from the schema', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        { region: 'europe', title: 'A', context: 'ctx', references: [] },
        { region: 'europe', title: 'B', context: 'ctx', references: [] },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate region/);
  });
});
