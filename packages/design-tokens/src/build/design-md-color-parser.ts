import { extractFrontmatterLines, matchTopLevelKey } from './frontmatter.ts';

const COLOR_ENTRY_PATTERN =
  /^\s+([a-z0-9]+(?:-[a-z0-9]+)*):\s*'?(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))'?\s*$/;
const INDENTED_ENTRY_PATTERN = /^\s+[A-Za-z0-9_-]+:\s*\S/;
const COLORS_KEY = 'colors';

export interface ColorEntry {
  readonly name: string;
  readonly hex: string;
}

export class DesignMdColorParser {
  parse(markdown: string): ColorEntry[] {
    const lines = extractFrontmatterLines(markdown);

    const entries: ColorEntry[] = [];
    let insideColors = false;
    for (const line of lines) {
      const topLevelKey = matchTopLevelKey(line);
      if (topLevelKey !== undefined) {
        insideColors = topLevelKey === COLORS_KEY;
        continue;
      }
      if (!insideColors) {
        continue;
      }
      const colorEntry = line.match(COLOR_ENTRY_PATTERN);
      if (colorEntry) {
        const [, name, hex] = colorEntry;
        if (name && hex) {
          entries.push({ name, hex });
        }
        continue;
      }
      if (INDENTED_ENTRY_PATTERN.test(line)) {
        throw new Error(`Malformed color entry in the DESIGN.md frontmatter: "${line.trim()}"`);
      }
    }

    if (entries.length === 0) {
      throw new Error('No colors found in the DESIGN.md frontmatter');
    }
    return entries;
  }
}
