const FRONTMATTER_DELIMITER = '---';

function isFrontmatterDelimiter(line: string | undefined): boolean {
  return line?.replace(/\r$/, '') === FRONTMATTER_DELIMITER;
}

export function extractFrontmatterLines(markdown: string): string[] {
  const lines = markdown.split('\n');
  if (!isFrontmatterDelimiter(lines[0])) {
    throw new Error('DESIGN.md must start with a YAML frontmatter block');
  }
  const closingIndex = lines.findIndex((line, index) => index >= 1 && isFrontmatterDelimiter(line));
  if (closingIndex === -1) {
    throw new Error('DESIGN.md frontmatter is not terminated');
  }
  return lines.slice(1, closingIndex);
}
