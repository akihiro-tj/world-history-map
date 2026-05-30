import { describe, expect, it } from 'vitest';
import { DesignMdColorParser } from '../src/build/design-md-color-parser.ts';

const DESIGN_MD = `---
name: World History Map
colors:
  role-selected: '#f73d62'
  surface-panel: '#2a2e33f2'
  text-primary: '#ffffff'
rounded:
  lg: 0.5rem
  full: 9999px
---

# Design System

Body prose.
`;

describe('DesignMdColorParser', () => {
  const parser = new DesignMdColorParser();

  it('parses the colors block from the frontmatter', () => {
    const colors = parser.parse(DESIGN_MD);
    expect(colors).toEqual([
      { name: 'role-selected', hex: '#f73d62' },
      { name: 'surface-panel', hex: '#2a2e33f2' },
      { name: 'text-primary', hex: '#ffffff' },
    ]);
  });

  it('ignores other frontmatter sections such as rounded', () => {
    const names = parser.parse(DESIGN_MD).map((color) => color.name);
    expect(names).not.toContain('lg');
    expect(names).not.toContain('full');
  });

  it('accepts 8-digit (alpha) hex values', () => {
    const colors = parser.parse(DESIGN_MD);
    expect(colors.find((color) => color.name === 'surface-panel')?.hex).toBe('#2a2e33f2');
  });

  it('throws when the document has no frontmatter', () => {
    expect(() => parser.parse('# No frontmatter')).toThrow('must start with a YAML frontmatter');
  });

  it('throws when the frontmatter has no colors', () => {
    const withoutColors = `---\nname: X\nrounded:\n  lg: 0.5rem\n---\n\nBody.\n`;
    expect(() => parser.parse(withoutColors)).toThrow('No colors found');
  });

  it('parses colors when the document uses CRLF line endings', () => {
    const colors = parser.parse(DESIGN_MD.replace(/\n/g, '\r\n'));
    expect(colors).toEqual([
      { name: 'role-selected', hex: '#f73d62' },
      { name: 'surface-panel', hex: '#2a2e33f2' },
      { name: 'text-primary', hex: '#ffffff' },
    ]);
  });

  it('throws when a color entry has a non-hex value', () => {
    const malformed = `---\nname: X\ncolors:\n  role-x: rebeccapurple\n---\n\nBody.\n`;
    expect(() => parser.parse(malformed)).toThrow('Malformed color entry');
  });

  it('throws when a hex value has an invalid digit count', () => {
    const malformed = `---\nname: X\ncolors:\n  role-x: '#12345'\n---\n\nBody.\n`;
    expect(() => parser.parse(malformed)).toThrow('Malformed color entry');
  });
});
