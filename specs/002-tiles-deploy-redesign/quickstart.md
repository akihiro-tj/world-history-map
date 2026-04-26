# Quickstart: タイル配信デプロイの新フロー

**Feature**: 002-tiles-deploy-redesign
**Date**: 2026-04-25

新アーキテクチャ完成後の運用イメージ。実装フェーズで参照される「あるべき体験」のドキュメント。

## ロール別の操作

### データ更新者（タイルを更新したい）

```bash
# 1. 上流データから PMTiles を再生成
pnpm pipeline run --year 1600

# 2. packages/tiles のビルド（hash 計算 + manifest.ts 更新）
pnpm --filter @world-history-map/tiles run build

# 3. 変更をコミット（src/pmtiles/ と src/manifest.ts のみ。dist は gitignored）
git add packages/tiles/src/
git commit -m "data: update 1600 territories"
git push

# → PR 作成、CI が DEV bucket に upload
# → Cloudflare Pages preview URL で動作確認
# → レビュー OK ならマージ
# → main の CI が PROD bucket に upload + Pages 本番 deploy 起動
```

### レビュアー（PR を確認したい）

1. PR ページの「Cloudflare Pages preview」リンクを開く
2. 該当年を選択して地図を確認
3. preview は本番から完全に独立しているため、操作は本番ユーザーに影響しない

### 運用者（事故が起きてロールバックしたい）

```bash
# 1. 問題のコミットを特定（manifest.ts が変化したコミット単位で確認）
git log --oneline packages/tiles/src/manifest.ts

# 2. revert PR を作成
git revert <bad-commit>
git push -u origin revert-<bad-commit>

# → PR: CI が DEV bucket に旧 hash が存在することを確認
# → マージ: main の CI が PROD bucket を旧 hash で更新、Pages Deploy Hook を発火
# → 5 分以内に本番が正常状態に復帰
```

**ロールバック窓について**

ロールバック窓は「`packages/tiles/src/manifest.ts` が変化した main コミット」を N=3 件保持します。その N コミット分で参照されているハッシュは R2 に必ず残ります。

- UI のみの変更など manifest が変わらないコミットはカウントされません
- 窓外（直近 3 件の manifest 変更より古い）コミットに戻す場合、GC で当該ハッシュが既に削除されている可能性があります。その場合は `packages/tiles/dist/` から手動で再 upload してください：

```bash
# 当該年のファイルを再アップロード（例: 1600 年）
apps/worker/node_modules/.bin/wrangler r2 object put \
  "world-history-map-tiles-prod/world_1600.<hash>.pmtiles" \
  --file packages/tiles/dist/world_1600.<hash>.pmtiles --remote
```

### 運用者（ストレージを掃除したい）

```bash
# まずは dry-run で削除候補を確認
gh workflow run tiles-gc.yml -f dry_run=true -f window_size=3 -f target_env=both

# 候補が妥当なら本実行
gh workflow run tiles-gc.yml -f dry_run=false -f window_size=3 -f target_env=both
```

月次 cron でも同様に動作（既定値: dry_run=false, window_size=3, target_env=both）。

## ローカル開発環境

```bash
# frontend dev server（packages/tiles のビルドが先に走る）
pnpm dev

# storybook
pnpm storybook

# packages/tiles のビルド検証
pnpm --filter @world-history-map/tiles run build:check  # manifest 鮮度確認
pnpm --filter @world-history-map/tiles run test         # テスト
```

`apps/frontend/public/pmtiles/` の binary は無くなり、`packages/tiles/src/pmtiles/` の raw binary を `packages/tiles/dist/` にビルドした結果を **vite の dev middleware** が `/pmtiles/` パスで配信する。
仕組み:

- `apps/frontend/package.json` の `dev` script は `predev` フックで `pnpm --filter @world-history-map/tiles run build` を先行実行する
- `apps/frontend/vite.config.ts` に `serve-tiles-dev` プラグインを追加し、`packages/tiles/dist/` を `/pmtiles/` で配信する（contracts/packages-tiles-api.md の「Dev mode tile resolution」を参照）
- frontend の `getTilesUrl(year, '')` は `pmtiles:///pmtiles/world_{year}.{hash}.pmtiles` を返し、dev middleware が解決する
- `vite build`（prod / preview）ではこのプラグインは無効、`VITE_TILES_BASE_URL` 経由で Worker / R2 から配信される

## トラブルシューティング

### Q. PR の CI が `build --check` で fail する

A. ローカルで `pnpm --filter @world-history-map/tiles run build` を実行し、`packages/tiles/src/manifest.ts` の差分をコミットする。
src/pmtiles/ の binary を更新したのに manifest.ts を更新し忘れている状態。

### Q. 本番マージ後、フロントエンドが古いタイルを表示する

A. ブラウザキャッシュの可能性。フロントエンドバンドル自体は Vite が hash 化するため通常は即時反映。
キャッシュバスターが効いていない場合は Cloudflare Pages のキャッシュ設定を確認。

### Q. revert したのに本番が戻らない

A. 該当コミットがロールバック窓 N を超えていて、参照する hash が GC で削除されている可能性。
`tiles-gc.yml` のログで削除履歴を確認。回復手順は別途運用ドキュメント。

### Q. dist binary がローカルで CI と違う hash になる

A. ハッシュ計算は `git ls-files` 経由で commit 済み binary を入力するため、未コミットの src/pmtiles/ 変更は反映されない。
src/pmtiles/ を変更したらまずコミットしてから build を実行する。

## 検証ポイント（実装完了時のチェック）

| 項目 | 確認方法 |
|---|---|
| frontend bundle に manifest が埋め込まれている | `grep 'world_1600' apps/frontend/dist/assets/*.js` がヒット |
| frontend bundle に `manifest.json` への runtime fetch が残っていない | `grep '/manifest.json' apps/frontend/dist/assets/*.js` がヒットしない |
| runtime manifest 取得が消えている（実環境） | DevTools Network タブで `manifest.json` リクエストが発生しないこと |
| PR の preview が DEV bucket を見ている | preview URL の Network タブで Worker URL（preview env）を確認 |
| frontend-only な main マージで本番が deploy される | tiles-deploy.yml ログで `has_tile_changes=false` かつ Pages Deploy Hook が発火していること |
| tile 変更ありの main マージ、PROD upload → Pages deploy の順 | CI workflow のログで時系列確認 |
| descriptions / index.json / color-scheme.json への影響なし | `git diff origin/main..HEAD -- apps/frontend/public/data/` が空 |
| GC dry-run の保持集合が直近 N コミット manifest を覆う | workflow summary を目視確認 |

## マイグレーション期間中の挙動

| Phase | frontend が読む manifest | R2 bucket |
|---|---|---|
| 移行前 | runtime fetch（Worker `/manifest.json`） | `world-history-map-tiles` のみ |
| Phase A 完了 | build-time import（packages/tiles） | 同上（旧 bucket 続投） |
| Phase B 完了 | build-time import | DEV / PROD に分離 |
| Phase C 完了 | build-time import | DEV / PROD のみ（旧 bucket 退役、Worker `/manifest.json` 削除） |
| Phase D 完了 | build-time import | 同上 + GC が稼働 |

各 Phase 境界で本番ユーザーへの可視差分はゼロを目標とする。
