import { describe, expect, it } from 'vitest';
import { DesignMdSpacingParser } from '../src/build/design-md-spacing-parser.ts';

const DESIGN_MD_WITH_SPACING = `---
name: World History Map
colors:
  role-selected: '#f73d62'
spacing:
  unit: 4px
---

# Design System
`;

describe('DesignMdSpacingParser', () => {
  const parser = new DesignMdSpacingParser();

  it('parses the spacing unit', () => {
    expect(parser.parse(DESIGN_MD_WITH_SPACING)).toEqual({ unit: '4px' });
  });

  it('ignores other frontmatter sections', () => {
    const result = parser.parse(DESIGN_MD_WITH_SPACING);
    expect(Object.keys(result)).toEqual(['unit']);
  });

  it('throws when spacing is absent', () => {
    const withoutSpacing = `---\nname: X\ncolors:\n  role-x: '#fff'\n---\nBody.\n`;
    expect(() => parser.parse(withoutSpacing)).toThrow('No spacing.unit found');
  });
});
