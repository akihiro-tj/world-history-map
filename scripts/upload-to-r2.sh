#!/bin/bash

# Upload hashed PMTiles files and manifest to Cloudflare R2
# Usage: ./scripts/upload-to-r2.sh
#
# Prerequisites:
#   1. Run `node scripts/prepare-pmtiles.mjs` first to generate hashed files
#   2. Set CLOUDFLARE_API_TOKEN environment variable or run `wrangler login`

set -e

BUCKET_NAME="world-history-map-tiles"
PMTILES_DIR="dist/pmtiles"

# Check if prepared files exist
if [ ! -d "$PMTILES_DIR" ] || [ ! -f "$PMTILES_DIR/manifest.json" ]; then
  echo "Error: Prepared files not found. Run 'node scripts/prepare-pmtiles.mjs' first."
  exit 1
fi

echo "Uploading PMTiles files to R2 bucket: $BUCKET_NAME"
echo "Source directory: $PMTILES_DIR"
echo ""

# Count files (excluding manifest)
FILE_COUNT=$(ls -1 "$PMTILES_DIR"/*.pmtiles 2>/dev/null | wc -l | tr -d ' ')
echo "Found $FILE_COUNT PMTiles files to upload"
echo ""

# Upload manifest first
echo "Uploading manifest.json..."
wrangler r2 object put "$BUCKET_NAME/manifest.json" --file "$PMTILES_DIR/manifest.json" --content-type "application/json" --remote
echo ""

# Upload PMTiles files
CURRENT=0
for file in "$PMTILES_DIR"/*.pmtiles; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$file")
  echo "[$CURRENT/$FILE_COUNT] Uploading $FILENAME..."
  wrangler r2 object put "$BUCKET_NAME/$FILENAME" --file "$file" --remote
done

echo ""
echo "Upload complete!"
echo "  - 1 manifest.json"
echo "  - $FILE_COUNT PMTiles files"
