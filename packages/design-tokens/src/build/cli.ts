import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DesignMdFrontmatterBuilder } from './design-md-frontmatter-builder.ts';
import type { CssSource } from './role-colors-builder.ts';
import { RoleColorsBuilder } from './role-colors-builder.ts';

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');
const THEME_CSS_PATH = path.join(PACKAGE_ROOT, 'src/theme.css');
const ROLE_COLORS_OUTPUT_PATH = path.join(PACKAGE_ROOT, 'src/role-colors.generated.ts');
const DESIGN_MD_PATH = path.join(REPO_ROOT, 'DESIGN.md');
const PROJECT_NAME = 'World History Map';

class FileSource implements CssSource {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(): Promise<string> {
    return readFile(this.filePath, 'utf-8');
  }
}

function createRoleColorsBuilder(): RoleColorsBuilder {
  return new RoleColorsBuilder({
    cssSource: new FileSource(THEME_CSS_PATH),
    outputPath: ROLE_COLORS_OUTPUT_PATH,
  });
}

function createDesignMdBuilder(): DesignMdFrontmatterBuilder {
  return new DesignMdFrontmatterBuilder({
    cssSource: new FileSource(THEME_CSS_PATH),
    documentSource: new FileSource(DESIGN_MD_PATH),
    projectName: PROJECT_NAME,
  });
}

async function runBuild(): Promise<void> {
  const roleColorsSource = await createRoleColorsBuilder().generateSource();
  await writeFile(ROLE_COLORS_OUTPUT_PATH, roleColorsSource);
  console.log('Generated role-colors.generated.ts');

  const designMdDocument = await createDesignMdBuilder().generateDocument();
  await writeFile(DESIGN_MD_PATH, designMdDocument);
  console.log('Generated DESIGN.md frontmatter');
}

async function runCheck(): Promise<void> {
  const roleColorsBuilder = createRoleColorsBuilder();
  const designMdBuilder = createDesignMdBuilder();
  const roleColorsFresh = await roleColorsBuilder.isFresh(await roleColorsBuilder.generateSource());
  const designMdFresh = await designMdBuilder.isFresh(await designMdBuilder.generateDocument());
  process.exit(roleColorsFresh && designMdFresh ? 0 : 1);
}

const isCheckMode = process.argv.includes('--check');
(isCheckMode ? runCheck() : runBuild()).catch((error) => {
  console.error(error);
  process.exit(1);
});
