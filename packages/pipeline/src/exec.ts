/**
 * Safe command execution wrapper
 * Uses execFile (no shell) to prevent command injection
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execFileAsync = promisify(execFile);
