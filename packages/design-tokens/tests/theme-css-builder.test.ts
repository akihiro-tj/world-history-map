import { describe, expect, it } from 'vitest';
import type { ColorEntry, SpacingTokens, TypographyEntry } from '../src/build/dtcg.ts';
import { ThemeCssEmitter } from '../src/build/theme-css-builder.ts';

const COLORS: ColorEntry[] = [
  { name: 'role-selected', hex: '#f73d62' },
  { name: 'surface-panel', hex: '#2a2e33f2' },
];

const TYPOGRAPHY: TypographyEntry[] = [
  { name: 'panel-title', fontSize: '18px', fontWeight: '600', lineHeight: '28px' },
  { name: 'body-sm', fontSize: '14px', lineHeight: '20px' },
];

const SPACING: SpacingTokens = { unit: '4px' };

describe('ThemeCssEmitter', () => {
  const emitter = new ThemeCssEmitter();

  it('emits a Tailwind @theme block with --color-* declarations', () => {
    const css = emitter.emit({ colors: COLORS, typography: TYPOGRAPHY, spacing: SPACING });
    expect(css).toContain('@theme {');
    expect(css).toContain('  --color-role-selected: #f73d62;');
    expect(css).toContain('  --color-surface-panel: #2a2e33f2;');
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('marks the output as generated', () => {
    expect(emitter.emit({ colors: COLORS, typography: TYPOGRAPHY, spacing: SPACING })).toContain(
      'Generated from DESIGN.md frontmatter',
    );
  });

  it('emits --text-* declarations with paired font-weight and line-height modifiers', () => {
    const css = emitter.emit({ colors: COLORS, typography: TYPOGRAPHY, spacing: SPACING });
    expect(css).toContain('  --text-panel-title: 18px;');
    expect(css).toContain('  --text-panel-title--font-weight: 600;');
    expect(css).toContain('  --text-panel-title--line-height: 28px;');
  });

  it('omits --font-weight for tokens that have no fontWeight', () => {
    const css = emitter.emit({ colors: COLORS, typography: TYPOGRAPHY, spacing: SPACING });
    expect(css).toContain('  --text-body-sm: 14px;');
    expect(css).toContain('  --text-body-sm--line-height: 20px;');
    expect(css).not.toContain('--text-body-sm--font-weight');
  });

  it('emits --spacing for the spacing unit', () => {
    const css = emitter.emit({ colors: COLORS, typography: TYPOGRAPHY, spacing: SPACING });
    expect(css).toContain('  --spacing: 4px;');
  });
});
