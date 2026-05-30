import { describe, expect, it } from 'vitest';
import {
  ColorPaletteParser,
  DesignMdFrontmatterBuilder,
  extractBody,
  FrontmatterEmitter,
} from '../src/build/design-md-frontmatter-builder.ts';
import type { CssSource } from '../src/build/role-colors-builder.ts';

const SAMPLE_THEME_CSS = `
@theme {
  --color-primary-500: oklch(0.55 0.18 250);
  --color-role-selected: oklch(0.65 0.22 15);
  --color-surface-panel: oklch(0.30 0.01 250 / 0.95);
  --color-text-primary: oklch(1 0 0);
}
`;

const SAMPLE_DESIGN_MD = `---
name: Old Name
colors:
  stale: '#000000'
---

# Design System

Body prose that must survive regeneration.
`;

const PROJECT_NAME = 'World History Map';

function sourceOf(content: string): CssSource {
  return { read: async () => content };
}

describe('ColorPaletteParser', () => {
  const parser = new ColorPaletteParser();

  it('parses every --color-* token, not only role colors', () => {
    const colors = parser.parse(SAMPLE_THEME_CSS);
    const names = colors.map((color) => color.name);
    expect(names).toEqual(['primary-500', 'role-selected', 'surface-panel', 'text-primary']);
  });

  it('converts opaque OKLCH to 6-digit hex', () => {
    const colors = parser.parse(SAMPLE_THEME_CSS);
    expect(colors.find((color) => color.name === 'primary-500')?.hex).toBe('#0072d5');
    expect(colors.find((color) => color.name === 'text-primary')?.hex).toBe('#ffffff');
  });

  it('converts OKLCH with alpha to 8-digit hex', () => {
    const colors = parser.parse(SAMPLE_THEME_CSS);
    const surfacePanel = colors.find((color) => color.name === 'surface-panel')?.hex;
    expect(surfacePanel).toMatch(/^#[0-9a-f]{8}$/);
  });

  it('throws when no --color-* definitions are found', () => {
    expect(() => parser.parse(':root { --radius: 8px; }')).toThrow(
      'No --color-* definitions found in CSS',
    );
  });
});

describe('FrontmatterEmitter', () => {
  it('emits a name and a colors block wrapped in delimiters', () => {
    const colors = new ColorPaletteParser().parse(SAMPLE_THEME_CSS);
    const frontmatter = new FrontmatterEmitter(PROJECT_NAME).emit(colors);
    expect(frontmatter.startsWith('---\nname: World History Map\ncolors:\n')).toBe(true);
    expect(frontmatter.endsWith('---')).toBe(true);
    expect(frontmatter).toContain("  primary-500: '#0072d5'");
  });
});

describe('extractBody', () => {
  it('returns everything after the closing delimiter', () => {
    expect(extractBody(SAMPLE_DESIGN_MD)).toBe(
      '\n# Design System\n\nBody prose that must survive regeneration.\n',
    );
  });

  it('returns the whole document when there is no frontmatter', () => {
    expect(extractBody('# No frontmatter here')).toBe('# No frontmatter here');
  });
});

describe('DesignMdFrontmatterBuilder', () => {
  it('replaces the frontmatter while preserving the body', async () => {
    const builder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(SAMPLE_DESIGN_MD),
      projectName: PROJECT_NAME,
    });
    const document = await builder.generateDocument();
    expect(document).toContain("  role-selected: '#f73d62'");
    expect(document).not.toContain("stale: '#000000'");
    expect(document).toContain('Body prose that must survive regeneration.');
  });

  it('is idempotent: regenerating its own output yields no change', async () => {
    const builder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(SAMPLE_DESIGN_MD),
      projectName: PROJECT_NAME,
    });
    const firstPass = await builder.generateDocument();
    const stableBuilder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(firstPass),
      projectName: PROJECT_NAME,
    });
    expect(await stableBuilder.generateDocument()).toBe(firstPass);
  });

  it('isFresh is true only when the stored document matches the generated one', async () => {
    const builder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(SAMPLE_DESIGN_MD),
      projectName: PROJECT_NAME,
    });
    const generated = await builder.generateDocument();

    const freshBuilder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(generated),
      projectName: PROJECT_NAME,
    });
    expect(await freshBuilder.isFresh(await freshBuilder.generateDocument())).toBe(true);
    expect(await builder.isFresh(generated)).toBe(false);
  });
});
