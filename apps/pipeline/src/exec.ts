import { type ExecFileOptions, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const DEFAULT_MAX_BUFFER = 100 * 1024 * 1024; // 100 MiB: tippecanoe prints dense progress to stderr on large years

const execFileRaw = promisify(execFile);

export function execFileAsync(
  file: string,
  args: readonly string[],
  options: Omit<ExecFileOptions, 'encoding'> = {},
) {
  return execFileRaw(file, args, { maxBuffer: DEFAULT_MAX_BUFFER, ...options });
}
