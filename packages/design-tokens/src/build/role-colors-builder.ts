import { readFile } from 'node:fs/promises';

export type RoleColors = Record<string, string>;

export function extractRoleColors(css: string): RoleColors {
  const pattern = /--color-role-([a-z]+)\s*:\s*([^;]+?)\s*;/g;
  const colors: RoleColors = {};
  for (const match of css.matchAll(pattern)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      colors[name] = value;
    }
  }
  if (Object.keys(colors).length === 0) {
    throw new Error('No --color-role-* definitions found in CSS');
  }
  return colors;
}

export function toTypeScriptSource(colors: RoleColors): string {
  const entries = Object.entries(colors)
    .map(([name, value]) => `  ${name}: '${value}',`)
    .join('\n');
  return [
    '// Generated from packages/design-tokens/src/theme.css. Do not edit by hand.',
    'export const roleColors = {',
    entries,
    '} as const;',
    '',
    'export type RoleColorKey = keyof typeof roleColors;',
    '',
  ].join('\n');
}

export class RoleColorsBuilder {
  private readonly cssPath: string;
  private readonly outputPath: string;

  constructor(cssPath: string, outputPath: string) {
    this.cssPath = cssPath;
    this.outputPath = outputPath;
  }

  async generateSource(): Promise<string> {
    const css = await readFile(this.cssPath, 'utf-8');
    return toTypeScriptSource(extractRoleColors(css));
  }

  async isFresh(): Promise<boolean> {
    const newSource = await this.generateSource();
    const existingSource = await readFile(this.outputPath, 'utf-8').catch(() => null);
    return existingSource === newSource;
  }
}
