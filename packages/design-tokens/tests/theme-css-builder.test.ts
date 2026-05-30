import { describe, expect, it } from 'vitest';
import type { ColorEntry } from '../src/build/design-md-color-parser.ts';
import { ThemeCssEmitter } from '../src/build/theme-css-builder.ts';

const COLORS: ColorEntry[] = [
  { name: 'role-selected', hex: '#f73d62' },
  { name: 'surface-panel', hex: '#2a2e33f2' },
];

describe('ThemeCssEmitter', () => {
  const emitter = new ThemeCssEmitter();

  it('emits a Tailwind @theme block with --color-* declarations', () => {
    const css = emitter.emit(COLORS);
    expect(css).toContain('@theme {');
    expect(css).toContain('  --color-role-selected: #f73d62;');
    expect(css).toContain('  --color-surface-panel: #2a2e33f2;');
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('marks the output as generated', () => {
    expect(emitter.emit(COLORS)).toContain('Generated from DESIGN.md frontmatter');
  });
});
