#!/usr/bin/env bash
# Natural Earth の陸地・海岸線から public/tiles/world.pmtiles を生成する
# nix devShell（tippecanoe）で実行する: nix develop -c pnpm tiles:build
set -euo pipefail
cd "$(dirname "$0")/.."

NE_TAG="v5.1.2"
BASE_URL="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_TAG}/geojson"
CACHE_DIR=".tiles-cache"
OUT="public/tiles/world.pmtiles"

declare -A SHA256=(
  [ne_110m_land.geojson]=9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9
  [ne_110m_coastline.geojson]=851f581ff5ffb844deed8ae1a9ce22e3c4bb3d74fa342cadb5d8e39b41ae7c3c
  [ne_50m_land.geojson]=e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b
  [ne_50m_coastline.geojson]=271f1c4c1908312bac6b29d158ea1356544beafc129f260005300913aa5ea283
  [ne_10m_land.geojson]=1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416
  [ne_10m_coastline.geojson]=6f75ae0e0de157b14946e2255eb1f5486d9a13819032e26d4610852d296788f6
)

sha256_of() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

mkdir -p "$CACHE_DIR" "$(dirname "$OUT")"
for file in "${!SHA256[@]}"; do
  if [[ ! -f "$CACHE_DIR/$file" ]]; then
    curl -fsSL "$BASE_URL/$file" -o "$CACHE_DIR/$file.tmp"
    mv "$CACHE_DIR/$file.tmp" "$CACHE_DIR/$file"
  fi
  actual="$(sha256_of "$CACHE_DIR/$file")"
  if [[ "$actual" != "${SHA256[$file]}" ]]; then
    echo "sha256 が一致しません: $file ($actual)" >&2
    exit 1
  fi
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 縮尺ごとにズーム範囲を分けて作り、最後に 1 つにまとめる
build_scale() {
  local scale="$1" minzoom="$2" maxzoom="$3"
  tippecanoe -o "$tmp/$scale.pmtiles" --force --quiet \
    -Z"$minzoom" -z"$maxzoom" \
    -L "land:$CACHE_DIR/ne_${scale}_land.geojson" \
    -L "coastline:$CACHE_DIR/ne_${scale}_coastline.geojson" \
    --exclude-all --no-tile-size-limit --no-feature-limit --detect-shared-borders
}

build_scale 110m 0 1
build_scale 50m 2 3
build_scale 10m 4 6

tile-join -o "$OUT" --force --quiet --no-tile-size-limit \
  "$tmp/110m.pmtiles" "$tmp/50m.pmtiles" "$tmp/10m.pmtiles"

echo "生成しました: $OUT ($(wc -c <"$OUT") バイト)"
