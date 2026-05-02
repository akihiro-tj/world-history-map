import { readFile } from 'node:fs/promises';

const ROLE_COLOR_VAR_PREFIX = '--color-role-';

export type RoleColors = Readonly<Record<string, string>>;

export function extractRoleColors(css: string): RoleColors {
  const pattern = new RegExp(`${ROLE_COLOR_VAR_PREFIX}([a-z]+)\\s*:\\s*([^;]+?)\\s*;`, 'g');
  const colors: Record<string, string> = {};
  for (const match of css.matchAll(pattern)) {
    const [, name, value] = match;
    if (!name || !value) continue;
    colors[name] = value;
  }
  if (Object.keys(colors).length === 0) {
    throw new Error(`No ${ROLE_COLOR_VAR_PREFIX}* definitions found in CSS`);
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

  constructor(paths: { cssPath: string; outputPath: string }) {
    this.cssPath = paths.cssPath;
    this.outputPath = paths.outputPath;
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
