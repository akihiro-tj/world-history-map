// Thin wrappers around the `@google/design.md` CLI. The package is ESM-only and
// exposes no stable programmatic API, so its bin is invoked directly via Node and
// its JSON output captured from stdout.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { type DesignTokens, type DtcgDocument, dtcgToTokens } from './dtcg.ts';

const DESIGN_MD_BIN = fileURLToPath(import.meta.resolve('@google/design.md'));

interface LintReport {
  readonly summary: { readonly errors: number };
}

function runDesignMd(args: readonly string[]): string {
  return execFileSync(process.execPath, [DESIGN_MD_BIN, ...args], {
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

// Validates DESIGN.md (structure, broken token references, WCAG contrast) and
// throws on errors. Warnings (e.g. an undefined `primary` color) are allowed.
export function lintDesignMd(designMdPath: string): void {
  let stdout: string;
  try {
    stdout = runDesignMd(['lint', '--format', 'json', designMdPath]);
  } catch (error) {
    // The CLI exits non-zero when errors are present but still writes the JSON
    // report to stdout, which `execFileSync` exposes on the thrown error.
    const stdoutOnError = (error as { stdout?: unknown }).stdout;
    if (typeof stdoutOnError !== 'string') throw error;
    stdout = stdoutOnError;
  }
  const { summary } = JSON.parse(stdout) as LintReport;
  if (summary.errors > 0) {
    throw new Error(
      `DESIGN.md failed @google/design.md lint with ${summary.errors} error(s). ` +
        'Run `pnpm --filter @world-history-map/design-tokens run lint` for details.',
    );
  }
}

export function loadDesignTokens(designMdPath: string): DesignTokens {
  const doc = JSON.parse(runDesignMd(['export', '--format', 'dtcg', designMdPath])) as DtcgDocument;
  return dtcgToTokens(doc);
}
