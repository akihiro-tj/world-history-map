import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CssSource } from './role-colors-builder.ts';
import { RoleColorsBuilder } from './role-colors-builder.ts';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DEFAULT_THEME_CSS_PATH = path.join(PACKAGE_ROOT, 'src/theme.css');
const DEFAULT_OUTPUT_PATH = path.join(PACKAGE_ROOT, 'src/role-colors.generated.ts');

class FileCssSource implements CssSource {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(): Promise<string> {
    return readFile(this.filePath, 'utf-8');
  }
}

async function runBuild(): Promise<void> {
  const builder = new RoleColorsBuilder({
    cssSource: new FileCssSource(DEFAULT_THEME_CSS_PATH),
    outputPath: DEFAULT_OUTPUT_PATH,
  });
  const source = await builder.generateSource();
  await writeFile(DEFAULT_OUTPUT_PATH, source);
  console.log('Generated role-colors.generated.ts');
}

async function runCheck(): Promise<void> {
  const builder = new RoleColorsBuilder({
    cssSource: new FileCssSource(DEFAULT_THEME_CSS_PATH),
    outputPath: DEFAULT_OUTPUT_PATH,
  });
  const source = await builder.generateSource();
  process.exit((await builder.isFresh(source)) ? 0 : 1);
}

const isCheckMode = process.argv.includes('--check');
(isCheckMode ? runCheck() : runBuild()).catch((error) => {
  console.error(error);
  process.exit(1);
});
