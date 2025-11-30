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

# List of available years from historical-basemaps repository
# Source: https://github.com/aourednik/historical-basemaps/tree/master/geojson
# Negative values represent BCE (Before Common Era)
AVAILABLE_YEARS=(
  # BCE (Before Common Era)
  -123000
  -10000
  -8000
  -5000
  -4000
  -3000
  -2000
  -1500
  -1000
  -700
  -500
  -400
  -323
  -300
  -200
  -100
  -1
  # CE (Common Era)
  100
  200
  300
  400
  500
  600
  700
  800
  900
  1000
  1100
  1200
  1279
  1300
  1400
  1492
  1500
  1530
  1600
  1650
  1700
  1715
  1783
  1800
  1815
  1880
  1900
  1914
  1920
  1930
  1938
  1945
  1960
  1994
  2000
  2010
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

# Check for dependencies
check_dependencies() {
  if ! command -v tippecanoe &> /dev/null; then
    echo "Error: tippecanoe is not installed"
    echo "Installation:"
    echo "  macOS:  brew install tippecanoe"
    echo "  Ubuntu: apt install tippecanoe"
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
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

  # BCE years use "bc" prefix in filename (e.g., world_bc1000.geojson)
  # CE years use the year directly (e.g., world_1650.geojson)
  local remote_filename
  if [[ $year -lt 0 ]]; then
    # Convert negative year to positive for BCE filename
    local bc_year=$(( -year ))
    remote_filename="world_bc${bc_year}.geojson"
  else
    remote_filename="world_${year}.geojson"
  fi

  local url="${HISTORICAL_BASEMAPS_BASE_URL}/${remote_filename}"
  echo "Downloading: $url"

  if ! curl -fsSL "$url" -o "$output_path"; then
    echo "Error: Failed to download GeoJSON for year ${year}"
    rm -f "$output_path"
    return 1
  fi

  echo "Saved: $output_path"
}

# Merge same-name polygons into MultiPolygons
merge_polygons() {
  local year=$1
  local input_path="${TEMP_DIR}/world_${year}.geojson"
  local output_path="${TEMP_DIR}/world_${year}_merged.geojson"

  if [[ ! -f "$input_path" ]]; then
    echo "Error: Input GeoJSON not found: $input_path"
    return 1
  fi

  echo "Merging same-name polygons..."
  node scripts/merge-same-name-polygons.mjs "$input_path" "$output_path"

  if [[ ! -f "$output_path" ]]; then
    echo "Error: Merge failed, output not created"
    return 1
  fi
}

# Convert GeoJSON to PMTiles
convert_to_pmtiles() {
  local year=$1
  local polygons_path="${TEMP_DIR}/world_${year}_merged.geojson"
  local labels_path="${TEMP_DIR}/world_${year}_merged_labels.geojson"
  local polygons_pmtiles="${TEMP_DIR}/world_${year}_polygons.pmtiles"
  local labels_pmtiles="${TEMP_DIR}/world_${year}_labels.pmtiles"
  local pmtiles_path="${OUTPUT_DIR}/world_${year}.pmtiles"

  mkdir -p "$OUTPUT_DIR"

  if [[ ! -f "$polygons_path" ]]; then
    echo "Error: Polygons GeoJSON not found: $polygons_path"
    return 1
  fi

  if [[ ! -f "$labels_path" ]]; then
    echo "Error: Labels GeoJSON not found: $labels_path"
    return 1
  fi

  echo "Converting polygons to PMTiles..."
  tippecanoe \
    --output="$polygons_pmtiles" \
    --force \
    --layer="territories" \
    --minimum-zoom=0 \
    --maximum-zoom=10 \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --simplification=10 \
    "$polygons_path"

  echo "Converting labels to PMTiles..."
  tippecanoe \
    --output="$labels_pmtiles" \
    --force \
    --layer="labels" \
    --minimum-zoom=0 \
    --maximum-zoom=10 \
    --no-tile-size-limit \
    --no-feature-limit \
    -r1 \
    "$labels_path"

  echo "Merging layers..."
  tile-join \
    --output="$pmtiles_path" \
    --force \
    --name="World ${year}" \
    --description="Historical territories in ${year}" \
    --attribution="© historical-basemaps (GPL-3.0)" \
    "$polygons_pmtiles" \
    "$labels_pmtiles"

  # Cleanup temporary files
  rm -f "$polygons_pmtiles" "$labels_pmtiles"

  echo "Conversion complete: $pmtiles_path"
}

# Process single year
process_year() {
  local year=$1

  echo "===== Processing year ${year} ====="

  if ! download_geojson "$year"; then
    return 1
  fi

  if ! merge_polygons "$year"; then
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
