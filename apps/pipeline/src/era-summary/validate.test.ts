import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateEraSummaryFile, type YearTerritoriesResolver } from '@/era-summary/validate.ts';

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

const resolveFranceOnly: YearTerritoriesResolver = (year) => ({
  descriptionIds: year === 1650 ? new Set(['france']) : null,
  geojsonNames: null,
});

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
    const resolveMuscovy: YearTerritoriesResolver = (year) => ({
      descriptionIds: year === 1650 ? new Set(['tsardom-of-muscovy']) : null,
      geojsonNames: null,
    });
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

  it('rejects a target that resolves by id but is not an exact GeoJSON NAME', () => {
    const resolveCaseSensitive: YearTerritoriesResolver = () => ({
      descriptionIds: new Set(['france']),
      geojsonNames: new Set(['France']),
    });
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'ヨーロッパ',
          context: 'フランスで絶対王政が確立しつつあった。',
          references: [{ kind: 'territory', target: 'france', text: 'フランス' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveCaseSensitive);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/is not an exact GeoJSON NAME/);
  });

  it('accepts a target that matches an exact GeoJSON NAME', () => {
    const resolveCaseSensitive: YearTerritoriesResolver = () => ({
      descriptionIds: new Set(['france']),
      geojsonNames: new Set(['France']),
    });
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

    const result = validateEraSummaryFile(filePath, resolveCaseSensitive);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('skips the NAME check when the GeoJSON is unavailable', () => {
    const resolveWithoutNames: YearTerritoriesResolver = () => ({
      descriptionIds: new Set(['france']),
      geojsonNames: null,
    });
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'ヨーロッパ',
          context: 'フランスで絶対王政が確立しつつあった。',
          references: [{ kind: 'territory', target: 'france', text: 'フランス' }],
        },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveWithoutNames);

    expect(result.valid).toBe(true);
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

  it('rejects a blank context', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [{ region: 'europe', title: 'ヨーロッパ', context: '   ', references: [] }],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/must not be blank/);
  });

  it('reports schema errors and reference errors in a single pass', () => {
    const filePath = writeSummary({
      year: 1650,
      regions: [
        {
          region: 'europe',
          title: 'A',
          context: 'ctx',
          references: [{ kind: 'territory', target: 'France', text: 'フランス' }],
        },
        { region: 'europe', title: 'B', context: 'ctx', references: [] },
      ],
    });

    const result = validateEraSummaryFile(filePath, resolveFranceOnly);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/duplicate region/);
    expect(result.errors.join(' ')).toMatch(/does not appear in context/);
  });
});
