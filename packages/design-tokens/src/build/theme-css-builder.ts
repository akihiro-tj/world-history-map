import type { ColorEntry, SpacingTokens, TypographyEntry } from './dtcg.ts';

const GENERATED_HEADER = [
  '/* Generated from DESIGN.md frontmatter. Do not edit by hand. */',
  '/* Run `pnpm --filter @world-history-map/design-tokens run build` to regenerate. */',
].join('\n');

interface ThemeCssInput {
  readonly colors: ColorEntry[];
  readonly typography: TypographyEntry[];
  readonly spacing: SpacingTokens;
}

export class ThemeCssEmitter {
  emit({ colors, typography, spacing }: ThemeCssInput): string {
    const colorDeclarations = colors.map((color) => `  --color-${color.name}: ${color.hex};`);

    const typographyDeclarations = typography.flatMap((token) => [
      `  --text-${token.name}: ${token.fontSize};`,
      ...(token.fontWeight !== undefined
        ? [`  --text-${token.name}--font-weight: ${token.fontWeight};`]
        : []),
      `  --text-${token.name}--line-height: ${token.lineHeight};`,
    ]);

    const spacingDeclaration = `  --spacing: ${spacing.unit};`;

    return [GENERATED_HEADER, '@theme {', ...colorDeclarations, ...typographyDeclarations, spacingDeclaration, '}', ''].join('\n');
  }
}
