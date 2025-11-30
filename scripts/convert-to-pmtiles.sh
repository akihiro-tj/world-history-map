#!/usr/bin/env bash
#
# convert-to-pmtiles.sh
# Convert historical-basemaps GeoJSON to PMTiles format
#
# Usage:
#   ./scripts/convert-to-pmtiles.sh [year]
#   ./scripts/convert-to-pmtiles.sh 1650
#   ./scripts/convert-to-pmtiles.sh all    # Convert all available years
#
# Prerequisites:
#   - tippecanoe must be installed
#     brew install tippecanoe (macOS)
#     apt install tippecanoe (Ubuntu/Debian)
#
# License:
#   Data converted by this script is provided under GPL-3.0 license
#   from historical-basemaps (https://github.com/aourednik/historical-basemaps)

set -euo pipefail

# Configuration
HISTORICAL_BASEMAPS_BASE_URL="https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson"
OUTPUT_DIR="public/pmtiles"
TEMP_DIR=".cache/geojson"

# List of available years (available in historical-basemaps)
# Note: Check the repository to update available years
AVAILABLE_YEARS=(
  1650
  1700
  1715
  1783
  1815
  1880
  1914
  1920
  1938
  1945
  1994
  2020
)

# Show help
show_help() {
  cat << EOF
Usage: $0 [year|all|list]

Arguments:
  year    Year to convert (e.g., 1650)
  all     Convert all available years
  list    Show list of available years

Examples:
  $0 1650        # Convert data for year 1650
  $0 all         # Convert all years
  $0 list        # Show available years
EOF
}

# Check for tippecanoe
check_dependencies() {
  if ! command -v tippecanoe &> /dev/null; then
    echo "Error: tippecanoe is not installed"
    echo "Installation:"
    echo "  macOS:  brew install tippecanoe"
    echo "  Ubuntu: apt install tippecanoe"
    exit 1
  fi
}

# Download GeoJSON
download_geojson() {
  local year=$1
  local output_path="${TEMP_DIR}/world_${year}.geojson"

  mkdir -p "$TEMP_DIR"

  if [[ -f "$output_path" ]]; then
    echo "Using cache: $output_path"
    return 0
  fi

  local url="${HISTORICAL_BASEMAPS_BASE_URL}/world_${year}.geojson"
  echo "Downloading: $url"

  if ! curl -fsSL "$url" -o "$output_path"; then
    echo "Error: Failed to download GeoJSON for year ${year}"
    rm -f "$output_path"
    return 1
  fi

  echo "Saved: $output_path"
}

# Convert GeoJSON to PMTiles
convert_to_pmtiles() {
  local year=$1
  local geojson_path="${TEMP_DIR}/world_${year}.geojson"
  local pmtiles_path="${OUTPUT_DIR}/world_${year}.pmtiles"

  mkdir -p "$OUTPUT_DIR"

  if [[ ! -f "$geojson_path" ]]; then
    echo "Error: GeoJSON file not found: $geojson_path"
    return 1
  fi

  echo "Converting: $geojson_path -> $pmtiles_path"

  tippecanoe \
    --output="$pmtiles_path" \
    --force \
    --layer="territories" \
    --name="World ${year}" \
    --description="Historical territories in ${year}" \
    --attribution="© historical-basemaps (GPL-3.0)" \
    --minimum-zoom=0 \
    --maximum-zoom=10 \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --simplification=10 \
    "$geojson_path"

  echo "Conversion complete: $pmtiles_path"
}

# Process single year
process_year() {
  local year=$1

  echo "===== Processing year ${year} ====="

  if ! download_geojson "$year"; then
    return 1
  fi

  if ! convert_to_pmtiles "$year"; then
    return 1
  fi

  echo "===== Completed year ${year} ====="
}

# List available years
list_years() {
  echo "Available years:"
  for year in "${AVAILABLE_YEARS[@]}"; do
    echo "  - $year"
  done
}

# Main
main() {
  if [[ $# -lt 1 ]]; then
    show_help
    exit 1
  fi

  check_dependencies

  case "$1" in
    -h|--help|help)
      show_help
      ;;
    list)
      list_years
      ;;
    all)
      echo "Converting all years..."
      for year in "${AVAILABLE_YEARS[@]}"; do
        if ! process_year "$year"; then
          echo "Warning: Failed to process year ${year}. Continuing..."
        fi
      done
      echo "All conversions complete"
      ;;
    *)
      if [[ "$1" =~ ^-?[0-9]+$ ]]; then
        process_year "$1"
      else
        echo "Error: Invalid argument: $1"
        show_help
        exit 1
      fi
      ;;
  esac
}

main "$@"
