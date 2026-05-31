import type { ColorEntry } from './dtcg.ts';

const ROLE_PREFIX = 'role-';

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export class RoleColorsEmitter {
  emit(colors: ColorEntry[]): string {
    const roleLines = colors
      .filter((color) => color.name.startsWith(ROLE_PREFIX))
      .map((color) => `  ${kebabToCamel(color.name.slice(ROLE_PREFIX.length))}: '${color.hex}',`);
    if (roleLines.length === 0) {
      throw new Error('No role-* colors found in the DESIGN.md frontmatter');
    }
    return [
      '// Generated from DESIGN.md frontmatter. Do not edit by hand.',
      '// Run `pnpm --filter @world-history-map/design-tokens run build` to regenerate.',
      'export const roleColors = {',
      ...roleLines,
      '} as const;',
      '',
      'export type RoleColorKey = keyof typeof roleColors;',
      '',
    ].join('\n');
  }
}
