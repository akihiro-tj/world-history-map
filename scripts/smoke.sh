#!/usr/bin/env bash
# デプロイ先（本番・プレビュー）の基本動作を確認する
# 使い方: bash scripts/smoke.sh https://example.workers.dev
set -euo pipefail

base="${1%/}"
fail() {
  echo "$1" >&2
  exit 1
}

manifest="$(curl -fsS "$base/asset-manifest.json")"
tiles="$(jq -r '."tiles/world.pmtiles"' <<<"$manifest")"
cities="$(jq -r '."data/cities.json"' <<<"$manifest")"

curl -fsS -o /dev/null "$base/" || fail "トップページが取得できません"

status="$(curl -sS -o /dev/null -w '%{http_code}' -r 0-16383 "$base$tiles")"
[[ "$status" == 206 ]] || fail "タイルの Range 応答が 206 ではありません: $status"

etag="$(curl -sS -D - -o /dev/null -r 0-99 "$base$tiles" | tr -d '\r' | awk -F': ' 'tolower($1) == "etag" { print $2 }')"
[[ -n "$etag" && "$etag" != W/* ]] || fail "タイルの ETag が無いか、弱い ETag です: $etag"

status="$(curl -sS -o /dev/null -w '%{http_code}' -r 999999999-1000000000 "$base$tiles")"
[[ "$status" == 416 ]] || fail "範囲外の Range が 416 になりません: $status"

curl -fsS "$base$cities" | jq -e 'type == "array"' >/dev/null || fail "都市データが取得できません"

echo "スモークテスト成功: $base"
