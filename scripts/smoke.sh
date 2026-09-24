#!/usr/bin/env bash
# デプロイ先（本番・プレビュー）の基本動作を確認する
# 使い方: bash scripts/smoke.sh https://example.workers.dev
# デプロイ直後は新しいバージョンが行き渡っていないことがあるので、失敗したら間を置いてやり直す
set -euo pipefail

base="${1%/}"
attempts="${SMOKE_ATTEMPTS:-10}"
interval="${SMOKE_INTERVAL:-6}"

fail() {
  echo "$1" >&2
  return 1
}

check() {
  local manifest tiles cities status etag
  manifest="$(curl -fsS "$base/asset-manifest.json")" || fail "manifest が取得できません" || return 1
  tiles="$(jq -r '."tiles/world.pmtiles"' <<<"$manifest")"
  cities="$(jq -r '."data/cities.json"' <<<"$manifest")"

  curl -fsS -o /dev/null "$base/" || fail "トップページが取得できません" || return 1

  status="$(curl -sS -o /dev/null -w '%{http_code}' -r 0-16383 "$base$tiles")"
  [[ "$status" == 206 ]] || fail "タイルの Range 応答が 206 ではありません: $status" || return 1

  etag="$(curl -sS -D - -o /dev/null -r 0-99 "$base$tiles" | tr -d '\r' | awk -F': ' 'tolower($1) == "etag" { print $2 }')"
  [[ -n "$etag" && "$etag" != W/* ]] || fail "タイルの ETag が無いか、弱い ETag です: $etag" || return 1

  status="$(curl -sS -o /dev/null -w '%{http_code}' -r 999999999-1000000000 "$base$tiles")"
  [[ "$status" == 416 ]] || fail "範囲外の Range が 416 になりません: $status" || return 1

  curl -fsS "$base$cities" | jq -e 'type == "array"' >/dev/null || fail "都市データが取得できません" || return 1
}

for ((i = 1; i <= attempts; i++)); do
  if check; then
    echo "スモークテスト成功: $base"
    exit 0
  fi
  if ((i < attempts)); then
    echo "${i} 回目の確認に失敗しました。${interval} 秒後にやり直します" >&2
    sleep "$interval"
  fi
done

echo "スモークテスト失敗: $base（${attempts} 回試しました）" >&2
exit 1
