import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  extractRoleColors,
  RoleColorsBuilder,
  toTypeScriptSource,
} from '../src/build/role-colors-builder.ts';

const SAMPLE_CSS = `
@theme {
  --color-role-selected: oklch(0.65 0.22 15);
  --color-role-loading: oklch(0.78 0.14 165);
  --color-role-warn: oklch(0.78 0.16 75);
  --color-role-error: oklch(0.65 0.22 27);
  --color-role-focus: oklch(0.55 0.18 250);
}
`;

describe('extractRoleColors', () => {
  it('extracts all --color-role-* values from CSS', () => {
    const colors = extractRoleColors(SAMPLE_CSS);
    expect(colors).toEqual({
      selected: 'oklch(0.65 0.22 15)',
      loading: 'oklch(0.78 0.14 165)',
      warn: 'oklch(0.78 0.16 75)',
      error: 'oklch(0.65 0.22 27)',
      focus: 'oklch(0.55 0.18 250)',
    });
  });

  it('ignores non-role color variables', () => {
    const css = `
      --color-primary-50: oklch(0.97 0.01 250);
      --color-role-selected: oklch(0.65 0.22 15);
    `;
    const colors = extractRoleColors(css);
    expect(Object.keys(colors)).toEqual(['selected']);
  });

  it('throws when no --color-role-* definitions are found', () => {
    expect(() => extractRoleColors('--color-primary-50: red;')).toThrow(
      'No --color-role-* definitions found in CSS',
    );
  });
});

describe('toTypeScriptSource', () => {
  it('generates valid TypeScript source with as const', () => {
    const source = toTypeScriptSource({ selected: 'oklch(0.65 0.22 15)' });
    expect(source).toContain("selected: 'oklch(0.65 0.22 15)'");
    expect(source).toContain('} as const;');
    expect(source).toContain('export type RoleColorKey');
  });
});

describe('RoleColorsBuilder', () => {
  let tmpDir: string;
  let cssPath: string;
  let outputPath: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-tokens-test-'));
    cssPath = path.join(tmpDir, 'theme.css');
    outputPath = path.join(tmpDir, 'role-colors.generated.ts');
    await fs.writeFile(cssPath, SAMPLE_CSS);
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('generateSource returns TypeScript source containing all 5 role colors', async () => {
    const builder = new RoleColorsBuilder({ cssPath, outputPath });
    const source = await builder.generateSource();
    expect(source).toContain("selected: 'oklch(0.65 0.22 15)'");
    expect(source).toContain("loading: 'oklch(0.78 0.14 165)'");
    expect(source).toContain("warn: 'oklch(0.78 0.16 75)'");
    expect(source).toContain("error: 'oklch(0.65 0.22 27)'");
    expect(source).toContain("focus: 'oklch(0.55 0.18 250)'");
  });

  it('isFresh returns false when output file does not exist', async () => {
    const builder = new RoleColorsBuilder({ cssPath, outputPath });
    expect(await builder.isFresh()).toBe(false);
  });

  it('isFresh returns true after writing the generated source', async () => {
    const builder = new RoleColorsBuilder({ cssPath, outputPath });
    const source = await builder.generateSource();
    await fs.writeFile(outputPath, source);
    expect(await builder.isFresh()).toBe(true);
  });

  it('isFresh returns false when CSS is modified after generation', async () => {
    const builder = new RoleColorsBuilder({ cssPath, outputPath });
    const source = await builder.generateSource();
    await fs.writeFile(outputPath, source);

    await fs.writeFile(cssPath, SAMPLE_CSS.replace('oklch(0.65 0.22 15)', 'oklch(0.70 0.25 20)'));

    expect(await builder.isFresh()).toBe(false);

    await fs.writeFile(cssPath, SAMPLE_CSS);
  });
});
