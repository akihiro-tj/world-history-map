import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoleColorsBuilder } from './role-colors-builder.ts';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DEFAULT_THEME_CSS_PATH = path.join(PACKAGE_ROOT, 'src/theme.css');
const DEFAULT_OUTPUT_PATH = path.join(PACKAGE_ROOT, 'src/role-colors.generated.ts');

async function runBuild(): Promise<void> {
  const builder = new RoleColorsBuilder(DEFAULT_THEME_CSS_PATH, DEFAULT_OUTPUT_PATH);
  const source = await builder.generateSource();
  await writeFile(DEFAULT_OUTPUT_PATH, source);
  console.log('Generated role-colors.generated.ts');
}

async function runCheck(): Promise<void> {
  const builder = new RoleColorsBuilder(DEFAULT_THEME_CSS_PATH, DEFAULT_OUTPUT_PATH);
  const isFresh = await builder.isFresh();
  process.exit(isFresh ? 0 : 1);
}

const isCheckMode = process.argv.includes('--check');
(isCheckMode ? runCheck() : runBuild()).catch((err) => {
  console.error(err);
  process.exit(1);
});
