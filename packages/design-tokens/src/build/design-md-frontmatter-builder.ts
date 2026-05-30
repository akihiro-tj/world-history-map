import { oklchToHex } from './oklch.ts';
import type { TextSource } from './text-source.ts';

const COLOR_VAR_PATTERN = /--color-([a-z0-9]+(?:-[a-z0-9]+)*)\s*:\s*([^;]+?)\s*;/g;
const FRONTMATTER_DELIMITER = '---';

export interface ColorEntry {
  readonly name: string;
  readonly hex: string;
}

export class ColorPaletteParser {
  parse(css: string): ColorEntry[] {
    const entries: ColorEntry[] = [];
    for (const match of css.matchAll(COLOR_VAR_PATTERN)) {
      const [, name, value] = match;
      if (!name || !value) continue;
      entries.push({ name, hex: oklchToHex(value) });
    }
    if (entries.length === 0) {
      throw new Error('No --color-* definitions found in CSS');
    }
    return entries;
  }
}

export class FrontmatterEmitter {
  private readonly projectName: string;

  constructor(projectName: string) {
    this.projectName = projectName;
  }

  emit(colors: ColorEntry[]): string {
    const colorLines = colors.map((color) => `  ${color.name}: '${color.hex}'`).join('\n');
    return [
      FRONTMATTER_DELIMITER,
      `name: ${this.projectName}`,
      'colors:',
      colorLines,
      FRONTMATTER_DELIMITER,
    ].join('\n');
  }
}

function isFrontmatterDelimiter(line: string | undefined): boolean {
  return line?.replace(/\r$/, '') === FRONTMATTER_DELIMITER;
}

export function extractBody(document: string): string {
  const lines = document.split('\n');
  if (!isFrontmatterDelimiter(lines[0])) {
    return document;
  }
  const closingIndex = lines.findIndex((line, index) => index >= 1 && isFrontmatterDelimiter(line));
  if (closingIndex === -1) {
    return document;
  }
  return lines.slice(closingIndex + 1).join('\n');
}

export class DesignMdFrontmatterBuilder {
  private readonly cssSource: TextSource;
  private readonly documentSource: TextSource;
  private readonly projectName: string;

  constructor(params: {
    cssSource: TextSource;
    documentSource: TextSource;
    projectName: string;
  }) {
    this.cssSource = params.cssSource;
    this.documentSource = params.documentSource;
    this.projectName = params.projectName;
  }

  async generateDocument(): Promise<string> {
    const css = await this.cssSource.read();
    const colors = new ColorPaletteParser().parse(css);
    const frontmatter = new FrontmatterEmitter(this.projectName).emit(colors);
    const existing = await this.documentSource.read();
    return [frontmatter, extractBody(existing)].join('\n');
  }

  isUpToDate(existing: string | null, generated: string): boolean {
    return existing === generated;
  }
}
