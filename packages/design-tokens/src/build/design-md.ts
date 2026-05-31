// Thin wrappers around the `@google/design.md` CLI. The package is ESM-only and
// exposes no stable programmatic API, so its bin is invoked directly via Node and
// its JSON output captured from stdout.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { type DesignTokens, type DtcgDocument, dtcgToTokens } from './dtcg.ts';

const DESIGN_MD_BIN = fileURLToPath(import.meta.resolve('@google/design.md'));

function runDesignMd(args: readonly string[]): string {
  return execFileSync(process.execPath, [DESIGN_MD_BIN, ...args], {
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

export function loadDesignTokens(designMdPath: string): DesignTokens {
  const doc = JSON.parse(runDesignMd(['export', '--format', 'dtcg', designMdPath])) as DtcgDocument;
  return dtcgToTokens(doc);
}
