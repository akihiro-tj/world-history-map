import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type CssSource,
  RoleColorModuleEmitter,
  RoleColorsBuilder,
  RoleColorToken,
  RoleColorTokenParser,
  RoleColorTokenSet,
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

const SAMPLE_CSS_MODIFIED = SAMPLE_CSS.replace('oklch(0.65 0.22 15)', 'oklch(0.70 0.25 20)');

const mockCssSource: CssSource = { read: async () => SAMPLE_CSS };

describe('RoleColorToken', () => {
  it('accepts valid lowercase name and non-empty value', () => {
    const token = new RoleColorToken('selected', 'oklch(0.65 0.22 15)');
    expect(token.name).toBe('selected');
    expect(token.value).toBe('oklch(0.65 0.22 15)');
  });

  it('throws for name with uppercase letters', () => {
    expect(() => new RoleColorToken('Selected', 'oklch(0.65 0.22 15)')).toThrow();
  });

  it('throws for name with digits', () => {
    expect(() => new RoleColorToken('selected1', 'oklch(0.65 0.22 15)')).toThrow();
  });

  it('accepts kebab-case name', () => {
    const token = new RoleColorToken('label-text', 'oklch(0.95 0 0)');
    expect(token.name).toBe('label-text');
  });

  it('throws for name with leading hyphen', () => {
    expect(() => new RoleColorToken('-selected', 'oklch(0.65 0.22 15)')).toThrow();
  });

  it('throws for name with trailing hyphen', () => {
    expect(() => new RoleColorToken('selected-', 'oklch(0.65 0.22 15)')).toThrow();
  });

  it('throws for name with consecutive hyphens', () => {
    expect(() => new RoleColorToken('label--text', 'oklch(0.95 0 0)')).toThrow();
  });

  it('throws for empty value', () => {
    expect(() => new RoleColorToken('selected', '')).toThrow();
  });

  it('throws for whitespace-only value', () => {
    expect(() => new RoleColorToken('selected', '   ')).toThrow();
  });
});

describe('RoleColorTokenSet', () => {
  it('throws when constructed with empty array', () => {
    expect(() => new RoleColorTokenSet([])).toThrow();
  });

  it('throws for duplicate token names', () => {
    const tokens = [
      new RoleColorToken('selected', 'oklch(0.65 0.22 15)'),
      new RoleColorToken('selected', 'oklch(0.70 0.25 20)'),
    ];
    expect(() => new RoleColorTokenSet(tokens)).toThrow();
  });

  it('toArray returns all tokens', () => {
    const token = new RoleColorToken('selected', 'oklch(0.65 0.22 15)');
    const tokenSet = new RoleColorTokenSet([token]);
    expect(tokenSet.toArray()).toHaveLength(1);
    expect(tokenSet.toArray()[0].name).toBe('selected');
  });
});

describe('RoleColorTokenParser', () => {
  const parser = new RoleColorTokenParser();

  it('parses all --color-role-* values from CSS', () => {
    const tokenSet = parser.parse(SAMPLE_CSS);
    const tokens = tokenSet.toArray();
    expect(tokens).toHaveLength(5);
    expect(tokens.find((t) => t.name === 'selected')?.value).toBe('oklch(0.65 0.22 15)');
    expect(tokens.find((t) => t.name === 'loading')?.value).toBe('oklch(0.78 0.14 165)');
  });

  it('ignores non-role color variables', () => {
    const css = `
      --color-primary-50: oklch(0.97 0.01 250);
      --color-role-selected: oklch(0.65 0.22 15);
    `;
    const tokenSet = parser.parse(css);
    expect(tokenSet.toArray()).toHaveLength(1);
    expect(tokenSet.toArray()[0].name).toBe('selected');
  });

  it('parses kebab-case role token names', () => {
    const css = `
      --color-role-label-text: oklch(0.95 0 0);
      --color-role-label-halo: oklch(0.20 0 0);
    `;
    const tokenSet = parser.parse(css);
    const tokens = tokenSet.toArray();
    expect(tokens).toHaveLength(2);
    expect(tokens.find((t) => t.name === 'label-text')?.value).toBe('oklch(0.95 0 0)');
    expect(tokens.find((t) => t.name === 'label-halo')?.value).toBe('oklch(0.20 0 0)');
  });

  it('throws when no --color-role-* definitions are found', () => {
    expect(() => parser.parse('--color-primary-50: red;')).toThrow(
      'No --color-role-* definitions found in CSS',
    );
  });
});

describe('RoleColorModuleEmitter', () => {
  const emitter = new RoleColorModuleEmitter();

  it('generates valid TypeScript source with as const and hex-converted values', () => {
    const tokenSet = new RoleColorTokenSet([new RoleColorToken('selected', 'oklch(0.65 0.22 15)')]);
    const source = emitter.emit(tokenSet);
    expect(source).toContain("selected: '#f73d62'");
    expect(source).toContain('} as const;');
    expect(source).toContain('export type RoleColorKey');
  });

  it('emits kebab-case names as camelCase keys', () => {
    const tokenSet = new RoleColorTokenSet([
      new RoleColorToken('label-text', 'oklch(0.95 0 0)'),
      new RoleColorToken('label-halo', 'oklch(0.20 0 0)'),
    ]);
    const source = emitter.emit(tokenSet);
    expect(source).toContain('labelText:');
    expect(source).toContain('labelHalo:');
    expect(source).not.toContain('label-text:');
    expect(source).not.toContain('label-halo:');
  });
});

describe('RoleColorsBuilder', () => {
  let temporaryDir: string;
  let outputPath: string;

  beforeAll(async () => {
    temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-tokens-test-'));
    outputPath = path.join(temporaryDir, 'role-colors.generated.ts');
  });

  afterAll(async () => {
    await fs.rm(temporaryDir, { recursive: true, force: true });
  });

  it('generateSource returns TypeScript source containing all 5 role colors as hex', async () => {
    const builder = new RoleColorsBuilder({ cssSource: mockCssSource, outputPath });
    const source = await builder.generateSource();
    expect(source).toContain("selected: '#f73d62'");
    expect(source).toContain("loading: '#49d3a1'");
    expect(source).toContain("warn: '#f2a618'");
    expect(source).toContain("error: '#f9423d'");
    expect(source).toContain("focus: '#0072d5'");
  });

  it('isFresh returns false when output file does not exist', async () => {
    const builder = new RoleColorsBuilder({ cssSource: mockCssSource, outputPath });
    const source = await builder.generateSource();
    expect(await builder.isFresh(source)).toBe(false);
  });

  it('isFresh returns true when generated source matches output file', async () => {
    const builder = new RoleColorsBuilder({ cssSource: mockCssSource, outputPath });
    const source = await builder.generateSource();
    await fs.writeFile(outputPath, source);
    expect(await builder.isFresh(source)).toBe(true);
  });

  it('isFresh returns false when generated source differs from output file', async () => {
    const builder = new RoleColorsBuilder({ cssSource: mockCssSource, outputPath });
    const source = await builder.generateSource();
    await fs.writeFile(outputPath, source);

    const modifiedBuilder = new RoleColorsBuilder({
      cssSource: { read: async () => SAMPLE_CSS_MODIFIED },
      outputPath,
    });
    const modifiedSource = await modifiedBuilder.generateSource();
    expect(await builder.isFresh(modifiedSource)).toBe(false);
  });
});
