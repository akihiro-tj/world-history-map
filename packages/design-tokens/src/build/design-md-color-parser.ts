const FRONTMATTER_DELIMITER = '---';
const TOP_LEVEL_KEY_PATTERN = /^([A-Za-z0-9_-]+):/;
const COLOR_ENTRY_PATTERN =
  /^\s+([a-z0-9]+(?:-[a-z0-9]+)*):\s*'?(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))'?\s*$/;
const INDENTED_ENTRY_PATTERN = /^\s+[A-Za-z0-9_-]+:\s*\S/;
const COLORS_KEY = 'colors';

export interface ColorEntry {
  readonly name: string;
  readonly hex: string;
}

function isFrontmatterDelimiter(line: string | undefined): boolean {
  return line?.replace(/\r$/, '') === FRONTMATTER_DELIMITER;
}

export class DesignMdColorParser {
  parse(markdown: string): ColorEntry[] {
    const lines = markdown.split('\n');
    if (!isFrontmatterDelimiter(lines[0])) {
      throw new Error('DESIGN.md must start with a YAML frontmatter block');
    }
    const closingIndex = lines.findIndex((line, index) => index >= 1 && isFrontmatterDelimiter(line));
    if (closingIndex === -1) {
      throw new Error('DESIGN.md frontmatter is not terminated');
    }

    const entries: ColorEntry[] = [];
    let insideColors = false;
    for (const line of lines.slice(1, closingIndex)) {
      const topLevelKey = line.match(TOP_LEVEL_KEY_PATTERN)?.[1];
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
