#!/usr/bin/env node

/**
 * Prepare PMTiles for R2 deployment with content-based hashing
 *
 * This script:
 * 1. Calculates MD5 hash for each PMTiles file
 * 2. Copies files with hashed names to dist/pmtiles
 * 3. Generates manifest.json mapping original names to hashed names
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const SOURCE_DIR = 'public/pmtiles';
const OUTPUT_DIR = 'dist/pmtiles';

/**
 * Calculate MD5 hash of a file (first 8 characters)
 */
async function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex').slice(0, 8)));
    stream.on('error', reject);
  });
}

/**
 * Extract year from filename (e.g., "world_1600.pmtiles" -> "1600")
 */
function extractYear(filename) {
  const match = filename.match(/world_(-?\d+)\.pmtiles$/);
  return match ? match[1] : null;
}

async function main() {
  console.log('Preparing PMTiles for R2 deployment...\n');

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all PMTiles files
  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.pmtiles'));
  console.log(`Found ${files.length} PMTiles files\n`);

  const manifest = {
    version: new Date().toISOString(),
    files: {},
  };

  for (const file of files) {
    const sourcePath = join(SOURCE_DIR, file);
    const year = extractYear(file);

    if (!year) {
      console.warn(`Skipping ${file}: could not extract year`);
      continue;
    }

    // Calculate hash
    const hash = await getFileHash(sourcePath);
    const hashedName = `world_${year}.${hash}.pmtiles`;
    const destPath = join(OUTPUT_DIR, hashedName);

    // Copy file with hashed name
    copyFileSync(sourcePath, destPath);

    // Add to manifest
    manifest.files[year] = hashedName;

    console.log(`  ${file} -> ${hashedName}`);
  }

  // Write manifest
  const manifestPath = join(OUTPUT_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${manifestPath}`);

  console.log(`\nPrepared ${Object.keys(manifest.files).length} files`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
