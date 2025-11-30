#!/usr/bin/env bash
#
# generate-index.sh
# public/pmtiles/index.json を生成するスクリプト
#
# 使用方法:
#   ./scripts/generate-index.sh
#
# 前提条件:
#   - jq がインストールされていること
#   - .cache/geojson/ に GeoJSON ファイルが存在すること

set -euo pipefail

OUTPUT_DIR="public/pmtiles"
CACHE_DIR=".cache/geojson"
OUTPUT_FILE="${OUTPUT_DIR}/index.json"

# jq の存在確認
if ! command -v jq &> /dev/null; then
  echo "エラー: jq がインストールされていません"
  exit 1
fi

# 年代エントリを生成
generate_year_entry() {
  local year=$1
  local geojson_path="${CACHE_DIR}/world_${year}.geojson"

  if [[ ! -f "$geojson_path" ]]; then
    echo "警告: GeoJSONが見つかりません: $geojson_path" >&2
    return 1
  fi

  local countries
  countries=$(jq -c '[.features[].properties.NAME] | unique | [.[] | select(type == "string")] | sort' "$geojson_path")

  echo "{\"year\":${year},\"filename\":\"world_${year}.pmtiles\",\"countries\":${countries}}"
}

# メイン処理
main() {
  local entries=()

  # キャッシュディレクトリ内のGeoJSONファイルから年代を取得
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
    echo "エラー: 処理可能なGeoJSONファイルがありません"
    exit 1
  fi

  # JSON配列として結合
  local json_array
  json_array=$(printf '%s\n' "${entries[@]}" | jq -s 'sort_by(.year)')

  # 最終的なindex.jsonを生成
  echo "{\"years\":${json_array}}" | jq '.' > "$OUTPUT_FILE"

  echo "生成完了: $OUTPUT_FILE"
  echo "年代数: ${#entries[@]}"
}

main
