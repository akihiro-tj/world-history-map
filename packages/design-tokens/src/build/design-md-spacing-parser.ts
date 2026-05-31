import { extractFrontmatterLines } from './frontmatter.ts';

const TOP_LEVEL_KEY_PATTERN = /^([A-Za-z0-9_-]+):/;
const UNIT_PATTERN = /^ {2}unit:\s*(.+?)\s*$/;
const SPACING_KEY = 'spacing';

export interface SpacingTokens {
  readonly unit: string;
}

export class DesignMdSpacingParser {
  parse(markdown: string): SpacingTokens {
    const lines = extractFrontmatterLines(markdown);

    let insideSpacing = false;
    let unit: string | null = null;

    for (const line of lines) {
      const topLevelKey = line.match(TOP_LEVEL_KEY_PATTERN)?.[1];
      if (topLevelKey !== undefined) {
        insideSpacing = topLevelKey === SPACING_KEY;
        continue;
      }
      if (!insideSpacing) continue;

      const unitMatch = line.match(UNIT_PATTERN);
      if (unitMatch !== null) {
        unit = unitMatch[1] as string;
      }
    }

    if (unit === null) {
      throw new Error('No spacing.unit found in the DESIGN.md frontmatter');
    }

    return { unit };
  }
}
