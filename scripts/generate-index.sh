#!/usr/bin/env bash
#
# generate-index.sh
# Generate public/pmtiles/index.json
#
# Usage:
#   ./scripts/generate-index.sh
#
# Prerequisites:
#   - jq must be installed
#   - GeoJSON files must exist in .cache/geojson/

set -euo pipefail

OUTPUT_DIR="public/pmtiles"
CACHE_DIR=".cache/geojson"
OUTPUT_FILE="${OUTPUT_DIR}/index.json"

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed"
  exit 1
fi

# Generate year entry
generate_year_entry() {
  local year=$1
  local geojson_path="${CACHE_DIR}/world_${year}.geojson"

  if [[ ! -f "$geojson_path" ]]; then
    echo "Warning: GeoJSON not found: $geojson_path" >&2
    return 1
  fi

  local countries
  countries=$(jq -c '[.features[].properties.NAME] | unique | [.[] | select(type == "string")] | sort' "$geojson_path")

  echo "{\"year\":${year},\"filename\":\"world_${year}.pmtiles\",\"countries\":${countries}}"
}

# Main
main() {
  local entries=()

  # Get years from GeoJSON files in cache directory
  for geojson in "${CACHE_DIR}"/world_*.geojson; do
    if [[ -f "$geojson" ]]; then
      local filename
      filename=$(basename "$geojson")
      # world_1650.geojson -> 1650
      local year="${filename#world_}"
      year="${year%.geojson}"

      if entry=$(generate_year_entry "$year"); then
        entries+=("$entry")
      fi
    fi
  done

  if [[ ${#entries[@]} -eq 0 ]]; then
    echo "Error: No GeoJSON files available to process"
    exit 1
  fi

  # Join as JSON array
  local json_array
  json_array=$(printf '%s\n' "${entries[@]}" | jq -s 'sort_by(.year)')

  # Generate final index.json
  echo "{\"years\":${json_array}}" | jq '.' > "$OUTPUT_FILE"

  echo "Generated: $OUTPUT_FILE"
  echo "Year count: ${#entries[@]}"
}

main
