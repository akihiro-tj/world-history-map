import type { ColorEntry } from './design-md-color-parser.ts';

const GENERATED_HEADER = [
  '/* Generated from DESIGN.md frontmatter. Do not edit by hand. */',
  '/* Run `pnpm --filter @world-history-map/design-tokens run build` to regenerate. */',
].join('\n');

export class ThemeCssEmitter {
  emit(colors: ColorEntry[]): string {
    const declarations = colors.map((color) => `  --color-${color.name}: ${color.hex};`);
    return [GENERATED_HEADER, '@theme {', ...declarations, '}', ''].join('\n');
  }
}
