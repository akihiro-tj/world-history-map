import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintDesignMd, loadDesignTokens } from './design-md.ts';
import { RoleColorsEmitter } from './role-colors-builder.ts';
import { ThemeCssEmitter } from './theme-css-builder.ts';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');
const DESIGN_MD_PATH = path.join(REPO_ROOT, 'DESIGN.md');
const THEME_CSS_PATH = path.join(PACKAGE_ROOT, 'src/theme.css');
const ROLE_COLORS_PATH = path.join(PACKAGE_ROOT, 'src/role-colors.generated.ts');

interface GeneratedArtifact {
  readonly path: string;
  readonly content: string;
}

async function readExisting(filePath: string): Promise<string | null> {
  return readFile(filePath, 'utf-8').catch(() => null);
}

async function generateArtifacts(): Promise<GeneratedArtifact[]> {
  lintDesignMd(DESIGN_MD_PATH);
  const { colors, typography, spacing } = loadDesignTokens(DESIGN_MD_PATH);
  return [
    { path: THEME_CSS_PATH, content: new ThemeCssEmitter().emit({ colors, typography, spacing }) },
    { path: ROLE_COLORS_PATH, content: new RoleColorsEmitter().emit(colors) },
  ];
}

async function runBuild(): Promise<void> {
  for (const artifact of await generateArtifacts()) {
    await writeFile(artifact.path, artifact.content);
    console.log(`Generated ${path.relative(PACKAGE_ROOT, artifact.path)}`);
  }
}

async function runCheck(): Promise<void> {
  const artifacts = await generateArtifacts();
  const staleArtifacts = (
    await Promise.all(
      artifacts.map(async (artifact) => ({
        relativePath: path.relative(PACKAGE_ROOT, artifact.path),
        isStale: (await readExisting(artifact.path)) !== artifact.content,
      })),
    )
  ).filter((result) => result.isStale);

  for (const { relativePath } of staleArtifacts) {
    console.error(
      `Stale: ${relativePath} (run \`pnpm --filter @world-history-map/design-tokens run build\`)`,
    );
  }
  process.exit(staleArtifacts.length > 0 ? 1 : 0);
}

const isCheckMode = process.argv.includes('--check');
(isCheckMode ? runCheck() : runBuild()).catch((error) => {
  console.error(error);
  process.exit(1);
});
