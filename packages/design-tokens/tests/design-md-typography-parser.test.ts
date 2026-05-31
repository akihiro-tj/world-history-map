import { describe, expect, it } from 'vitest';
import { DesignMdTypographyParser } from '../src/build/design-md-typography-parser.ts';

const DESIGN_MD = `---
name: World History Map
colors:
  role-selected: '#f73d62'
typography:
  panel-title:
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-sm:
    fontSize: 14px
    lineHeight: 20px
spacing:
  unit: 4px
---

# Design System
`;

describe('DesignMdTypographyParser', () => {
  const parser = new DesignMdTypographyParser();

  it('parses a token that has all three properties', () => {
    const tokens = parser.parse(DESIGN_MD);
    expect(tokens).toContainEqual({
      name: 'panel-title',
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '28px',
    });
  });

  it('parses a token without fontWeight', () => {
    const tokens = parser.parse(DESIGN_MD);
    expect(tokens).toContainEqual({ name: 'body-sm', fontSize: '14px', lineHeight: '20px' });
  });

  it('does not include fontWeight property when absent in DESIGN.md', () => {
    const bodySm = parser.parse(DESIGN_MD).find((t) => t.name === 'body-sm');
    expect(bodySm).not.toHaveProperty('fontWeight');
  });

  it('strips quotes from fontWeight values', () => {
    const panelTitle = parser.parse(DESIGN_MD).find((t) => t.name === 'panel-title');
    expect(panelTitle?.fontWeight).toBe('600');
  });

  it('ignores other frontmatter sections', () => {
    const names = parser.parse(DESIGN_MD).map((t) => t.name);
    expect(names).not.toContain('role-selected');
    expect(names).not.toContain('unit');
  });

  it('throws when no typography tokens are found', () => {
    const withoutTypography = `---\nname: X\ncolors:\n  role-x: '#fff'\n---\nBody.\n`;
    expect(() => parser.parse(withoutTypography)).toThrow('No typography tokens found');
  });

  it('throws when a token is missing fontSize', () => {
    const malformed = `---\ncolors:\n  role-x: '#fff'\ntypography:\n  bad-token:\n    lineHeight: 20px\n---\n`;
    expect(() => parser.parse(malformed)).toThrow('missing fontSize');
  });
});
