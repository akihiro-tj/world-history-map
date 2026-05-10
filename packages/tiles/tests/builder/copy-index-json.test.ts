import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyIndexJson } from '../../src/build/build.ts';

let sourceDir: string;
let distDir: string;

beforeAll(async () => {
  sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-copy-index-src-'));
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tiles-copy-index-dist-'));
});

afterAll(async () => {
  await fs.rm(sourceDir, { recursive: true, force: true });
  await fs.rm(distDir, { recursive: true, force: true });
});

describe('copyIndexJson', () => {
  it('does nothing when index.json does not exist in sourceDir', async () => {
    await copyIndexJson(sourceDir, distDir);
    const exists = await fs.stat(path.join(distDir, 'index.json')).catch(() => null);
    expect(exists).toBeNull();
  });

  it('copies index.json from sourceDir to distDir', async () => {
    const content = JSON.stringify({ years: [] });
    await fs.writeFile(path.join(sourceDir, 'index.json'), content);

    await copyIndexJson(sourceDir, distDir);

    const copied = await fs.readFile(path.join(distDir, 'index.json'), 'utf-8');
    expect(copied).toBe(content);
  });

  it('overwrites an existing index.json in distDir', async () => {
    await fs.writeFile(path.join(distDir, 'index.json'), 'old content');
    const newContent = JSON.stringify({ years: [{ year: 2000 }] });
    await fs.writeFile(path.join(sourceDir, 'index.json'), newContent);

    await copyIndexJson(sourceDir, distDir);

    const copied = await fs.readFile(path.join(distDir, 'index.json'), 'utf-8');
    expect(copied).toBe(newContent);
  });
});
