import { describe, expect, it } from 'vitest';
import { extractFrontmatterLines } from '../src/build/frontmatter.ts';

describe('extractFrontmatterLines', () => {
  it('returns the lines between the frontmatter delimiters', () => {
    const markdown = `---\nname: X\ncolors:\n  key: '#fff'\n---\n\nBody.\n`;
    const lines = extractFrontmatterLines(markdown);
    expect(lines).toContain('name: X');
    expect(lines).toContain('colors:');
  });

  it('does not include the delimiter lines themselves', () => {
    const markdown = `---\nname: X\n---\n`;
    const lines = extractFrontmatterLines(markdown);
    expect(lines).not.toContain('---');
  });

  it('throws when the document has no frontmatter', () => {
    expect(() => extractFrontmatterLines('# No frontmatter')).toThrow(
      'must start with a YAML frontmatter block',
    );
  });

  it('throws when the frontmatter is not terminated', () => {
    expect(() => extractFrontmatterLines('---\nname: X\n')).toThrow(
      'frontmatter is not terminated',
    );
  });

  it('handles CRLF line endings', () => {
    const lines = extractFrontmatterLines('---\r\nname: X\r\n---\r\n');
    expect(lines).toContain('name: X\r');
  });
});
