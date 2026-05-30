import { describe, expect, it } from 'vitest';
import {
  ColorPaletteParser,
  DesignMdFrontmatterBuilder,
  extractBody,
  FrontmatterEmitter,
} from '../src/build/design-md-frontmatter-builder.ts';
import type { TextSource } from '../src/build/text-source.ts';

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

function sourceOf(content: string): TextSource {
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
    expect(surfacePanel).toBe('#2a2e33f2');
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

  it('strips CRLF frontmatter without leaking it into the body', () => {
    const crlfDocument = SAMPLE_DESIGN_MD.replace(/\n/g, '\r\n');
    const body = extractBody(crlfDocument);
    expect(body).not.toContain('---');
    expect(body).not.toContain("stale: '#000000'");
    expect(body).toContain('Body prose that must survive regeneration.');
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

  it('preserves hand-authored frontmatter sections while regenerating name and colors', async () => {
    const documentWithRounded = `---
name: Old Name
colors:
  stale: '#000000'
rounded:
  lg: 0.5rem
  full: 9999px
---

# Design System

Body prose.
`;
    const builder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(documentWithRounded),
      projectName: PROJECT_NAME,
    });
    const document = await builder.generateDocument();
    expect(document).toContain('rounded:');
    expect(document).toContain('  lg: 0.5rem');
    expect(document).toContain('  full: 9999px');
    expect(document).toContain("  role-selected: '#f73d62'");
    expect(document).not.toContain("stale: '#000000'");
  });

  it('isUpToDate is true only when the existing document matches the generated one', async () => {
    const builder = new DesignMdFrontmatterBuilder({
      cssSource: sourceOf(SAMPLE_THEME_CSS),
      documentSource: sourceOf(SAMPLE_DESIGN_MD),
      projectName: PROJECT_NAME,
    });
    const generated = await builder.generateDocument();

    expect(builder.isUpToDate(generated, generated)).toBe(true);
    expect(builder.isUpToDate(null, generated)).toBe(false);
    expect(builder.isUpToDate(SAMPLE_DESIGN_MD, generated)).toBe(false);
  });
});
