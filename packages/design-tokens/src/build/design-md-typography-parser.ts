import { extractFrontmatterLines } from './frontmatter.ts';

const TOP_LEVEL_KEY_PATTERN = /^([A-Za-z0-9_-]+):/;
const TOKEN_NAME_PATTERN = /^ {2}([a-z][a-z0-9-]*):\s*$/;
const PROPERTY_PATTERN = /^ {4}(fontSize|fontWeight|lineHeight):\s*'?(.+?)'?\s*$/;
const TYPOGRAPHY_KEY = 'typography';

export interface TypographyEntry {
  readonly name: string;
  readonly fontSize: string;
  readonly fontWeight?: string;
  readonly lineHeight: string;
}

type MutableToken = {
  name: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
};

export class DesignMdTypographyParser {
  parse(markdown: string): TypographyEntry[] {
    const lines = extractFrontmatterLines(markdown);

    const entries: TypographyEntry[] = [];
    let insideTypography = false;
    let currentToken: MutableToken | null = null;

    for (const line of lines) {
      const topLevelKey = line.match(TOP_LEVEL_KEY_PATTERN)?.[1];
      if (topLevelKey !== undefined) {
        if (insideTypography && currentToken !== null) {
          entries.push(buildEntry(currentToken));
          currentToken = null;
        }
        insideTypography = topLevelKey === TYPOGRAPHY_KEY;
        continue;
      }
      if (!insideTypography) continue;

      const tokenNameMatch = line.match(TOKEN_NAME_PATTERN);
      if (tokenNameMatch !== null) {
        if (currentToken !== null) {
          entries.push(buildEntry(currentToken));
        }
        currentToken = { name: tokenNameMatch[1] as string };
        continue;
      }

      const propertyMatch = line.match(PROPERTY_PATTERN);
      if (propertyMatch !== null && currentToken !== null) {
        const key = propertyMatch[1];
        const value = propertyMatch[2];
        if (key !== undefined && value !== undefined) {
          if (key === 'fontSize') currentToken.fontSize = value;
          else if (key === 'fontWeight') currentToken.fontWeight = value;
          else if (key === 'lineHeight') currentToken.lineHeight = value;
        }
      }
    }

    if (currentToken !== null) {
      entries.push(buildEntry(currentToken));
    }

    if (entries.length === 0) {
      throw new Error('No typography tokens found in the DESIGN.md frontmatter');
    }

    return entries;
  }
}

function buildEntry(token: MutableToken): TypographyEntry {
  if (!token.fontSize) {
    throw new Error(`Typography token "${token.name}" is missing fontSize`);
  }
  if (!token.lineHeight) {
    throw new Error(`Typography token "${token.name}" is missing lineHeight`);
  }
  return token.fontWeight !== undefined
    ? { name: token.name, fontSize: token.fontSize, fontWeight: token.fontWeight, lineHeight: token.lineHeight }
    : { name: token.name, fontSize: token.fontSize, lineHeight: token.lineHeight };
}
