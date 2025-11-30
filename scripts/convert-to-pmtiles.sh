#!/usr/bin/env bash
#
# convert-to-pmtiles.sh
# historical-basemaps GeoJSONをPMTiles形式に変換するスクリプト
#
# 使用方法:
#   ./scripts/convert-to-pmtiles.sh [year]
#   ./scripts/convert-to-pmtiles.sh 1650
#   ./scripts/convert-to-pmtiles.sh all    # すべての年代を変換
#
# 前提条件:
#   - tippecanoe がインストールされていること
#     brew install tippecanoe (macOS)
#     apt install tippecanoe (Ubuntu/Debian)
#
# ライセンス:
#   このスクリプトで変換されるデータはGPL-3.0ライセンスで提供される
#   historical-basemaps (https://github.com/aourednik/historical-basemaps) からのもの

set -euo pipefail

# 設定
HISTORICAL_BASEMAPS_BASE_URL="https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson"
OUTPUT_DIR="public/pmtiles"
TEMP_DIR=".cache/geojson"

# 利用可能な年代の一覧（historical-basemapsで利用可能な年代）
# 注: 実際に利用可能な年代はリポジトリを確認して更新が必要
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

# ヘルプ表示
show_help() {
  cat << EOF
使用方法: $0 [year|all|list]

引数:
  year    変換する年代（例: 1650）
  all     すべての利用可能な年代を変換
  list    利用可能な年代の一覧を表示

例:
  $0 1650        # 1650年のデータを変換
  $0 all         # すべての年代を変換
  $0 list        # 利用可能な年代を表示
EOF
}

# tippecanoeの存在確認
check_dependencies() {
  if ! command -v tippecanoe &> /dev/null; then
    echo "エラー: tippecanoe がインストールされていません"
    echo "インストール方法:"
    echo "  macOS:  brew install tippecanoe"
    echo "  Ubuntu: apt install tippecanoe"
    exit 1
  fi
}

# GeoJSONをダウンロード
download_geojson() {
  local year=$1
  local output_path="${TEMP_DIR}/world_${year}.geojson"

  mkdir -p "$TEMP_DIR"

  if [[ -f "$output_path" ]]; then
    echo "キャッシュを使用: $output_path"
    return 0
  fi

  local url="${HISTORICAL_BASEMAPS_BASE_URL}/world_${year}.geojson"
  echo "ダウンロード中: $url"

  if ! curl -fsSL "$url" -o "$output_path"; then
    echo "エラー: ${year}年のGeoJSONのダウンロードに失敗しました"
    rm -f "$output_path"
    return 1
  fi

  echo "保存完了: $output_path"
}

# GeoJSONをPMTilesに変換
convert_to_pmtiles() {
  local year=$1
  local geojson_path="${TEMP_DIR}/world_${year}.geojson"
  local pmtiles_path="${OUTPUT_DIR}/world_${year}.pmtiles"

  mkdir -p "$OUTPUT_DIR"

  if [[ ! -f "$geojson_path" ]]; then
    echo "エラー: GeoJSONファイルが見つかりません: $geojson_path"
    return 1
  fi

  echo "変換中: $geojson_path -> $pmtiles_path"

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

  echo "変換完了: $pmtiles_path"
}

# 単一年代の処理
process_year() {
  local year=$1

  echo "===== ${year}年の処理を開始 ====="

  if ! download_geojson "$year"; then
    return 1
  fi

  if ! convert_to_pmtiles "$year"; then
    return 1
  fi

  echo "===== ${year}年の処理が完了 ====="
}

# 利用可能な年代を表示
list_years() {
  echo "利用可能な年代:"
  for year in "${AVAILABLE_YEARS[@]}"; do
    echo "  - $year"
  done
}

# メイン処理
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
      echo "すべての年代を変換します..."
      for year in "${AVAILABLE_YEARS[@]}"; do
        if ! process_year "$year"; then
          echo "警告: ${year}年の処理に失敗しました。続行します..."
        fi
      done
      echo "すべての変換が完了しました"
      ;;
    *)
      if [[ "$1" =~ ^-?[0-9]+$ ]]; then
        process_year "$1"
      else
        echo "エラー: 無効な引数: $1"
        show_help
        exit 1
      fi
      ;;
  esac
}

main "$@"
