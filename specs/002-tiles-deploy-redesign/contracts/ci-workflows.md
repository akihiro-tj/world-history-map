# Contract: CI Workflows

**Files**: `.github/workflows/{tiles-deploy,tiles-gc}.yml`
**Stability**: チーム内ツール。破壊的変更は plan 改訂を伴う

## `tiles-deploy.yml`

> 旧名 `tiles-upload.yml` から改称。tile 変更時のみ R2 upload を行い、main push 時は変更有無に関わらず必ず Pages Deploy Hook を発火させる責務を持つ

### Triggers

- `pull_request` — branch: `**`（**paths filter なし**: 全 PR で起動。tile 変更がない PR では upload が skip される）
- `push` — branch: `main`（**paths filter なし**: tile 変更なしの main マージでも frontend 本番 deploy を必ず起動するため）

### Inputs

なし（workflow_dispatch 拡張は将来検討、初版では不要）

### Required Secrets

| 名前 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | R2 object read/write 権限のみ |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler の認証先特定 |
| `PAGES_DEPLOY_HOOK_PROD` | main マージ後の Pages 本番 deploy 起動 URL（タイル変更の有無に関わらず常に発火） |

### Tile Change Detection

step として「tile 変更有無」を検出する：

```bash
# pull_request の場合
git diff --name-only origin/${{ github.base_ref }}...HEAD -- packages/tiles/src/

# push: main の場合
git diff --name-only ${{ github.event.before }}..${{ github.sha }} -- packages/tiles/src/
```

出力が空でなければ `has_tile_changes=true` を job output に立てる。

### Steps（PR）

1. checkout（fetch-depth=2、merge base 比較に必要）
2. pnpm setup
3. dependencies 復元（`pnpm install --frozen-lockfile`）
4. **Tile Change Detection** — `has_tile_changes` を判定
5. **`pnpm --filter @world-history-map/tiles run build:check`** で manifest.ts の鮮度を検証（古ければ fail）
6. `pnpm --filter @world-history-map/tiles run build` で dist 再生成（決定的なので冪等）
7. **`if: has_tile_changes == 'true'`** — dist の各 `*.pmtiles` を **DEV bucket** へ差分 upload
   - `wrangler r2 object get world-history-map-tiles-dev/<key> --remote --pipe > /dev/null` で存在チェック
   - 不在のみ `wrangler r2 object put` を実行
   - tile 変更がない PR ではこの step ごと skip される
8. PR では Pages Deploy Hook は **発火しない**（preview は GitHub 連携の Cloudflare Pages 標準機能で別途生成）

### Steps（main push）

1. PR と同じ 1〜6 を実行
2. **`if: has_tile_changes == 'true'`** — dist の各 `*.pmtiles` を **PROD bucket** へ差分 upload
3. **無条件で** `curl -X POST $PAGES_DEPLOY_HOOK_PROD` で Pages の本番 deploy を起動（tile 変更の有無に関わらず）
4. step 2 が失敗した場合、step 3 を実行しない（Pages を壊さない）。step 1 の build:check や build:full が失敗した場合も同様

### Outputs

- `outputs.has_tile_changes` — boolean（tile 変更検出結果）
- `outputs.uploaded_count` — 実際に PUT された object 数（観測用、has_tile_changes=false なら 0）
- `outputs.skipped_count` — 既存で skip された object 数
- `outputs.pages_deploy_triggered` — boolean（main push かつ Deploy Hook 発火に成功したか）

### Performance Budget

| 操作 | 目標 |
|---|---|
| build:check（変更なし、pass） | 5 秒以内 |
| build（変更あり、フル再生成） | 30 秒以内 |
| 差分 upload（典型 PR、1〜3 ファイル） | 2 分以内 |
| 全件 upload（最悪ケース、50 ファイル） | 10 分以内 |
| Tile 変更なし main push の workflow 全体 | 1 分以内（build:check + Deploy Hook） |

### Test Cases（workflow 単体）

| 状況 | 期待挙動 |
|---|---|
| PR、tile 変更なし | upload step が skip される、build:check は pass、Deploy Hook 発火なし |
| PR、tile 1 件追加 | 該当 1 件のみ DEV へ PUT、Deploy Hook 発火なし |
| PR、manifest.ts が古い | build:check で fail、CI を red にする |
| main マージ、tile 変更あり、PROD upload 成功 | PROD upload → Deploy Hook 発火 の順 |
| main マージ、tile 変更あり、PROD upload 失敗 | Deploy Hook 発火しない、workflow fail |
| **main マージ、tile 変更なし**（frontend-only） | upload step skip、Deploy Hook **常に発火**、frontend 本番に反映される |
| main マージ、build:check fail | upload も Deploy Hook も発火しない、workflow fail |

## `tiles-gc.yml`

### Triggers

- `schedule` — `0 3 1 * *`（毎月 1 日 03:00 UTC）
- `workflow_dispatch` — 手動実行用（input: `dry_run`, `window_size`, `target_env`）

### Inputs

| 名前 | 型 | 既定 | 用途 |
|---|---|---|---|
| `dry_run` | boolean | `true` | true なら delete を発火しない |
| `window_size` | number | `3` | ロールバック窓 N |
| `target_env` | enum(dev, prod, both) | `both` | 対象バケット |

### Required Secrets

`tiles-deploy.yml` と共通の `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`（DELETE 権限が必要）

### Steps

1. checkout（fetch-depth=0、git log 全履歴必要）
2. `git log -n {window_size} --format=%H -- packages/tiles/src/manifest.ts` で commit 列を取得
3. 各 commit について `git show <commit>:packages/tiles/src/manifest.ts` を読み hash 付きファイル名を抽出
4. **保持集合** = 全 commit の union ＋ 現 HEAD の manifest（念のため）
5. 対象バケットを `wrangler r2 object list --remote` で全件列挙
6. **削除候補** = 列挙集合 − 保持集合
7. dry_run=true なら候補をログ出力して終了
8. dry_run=false なら `wrangler r2 object delete <bucket>/<key> --remote` を逐次実行
9. summary を job summary に出力（保持件数 / 削除件数 / バケットサイズ before/after）

### Outputs

- `outputs.kept_count` — 保持対象 object 数
- `outputs.deleted_count` — 削除した（または削除予定の）object 数
- `outputs.bucket_size_before` — 実行前のバケットサイズ
- `outputs.bucket_size_after` — 実行後（dry_run=false のとき）のサイズ

### Performance Budget

| 操作 | 目標 |
|---|---|
| 履歴取得 + 保持集合計算 | 30 秒以内 |
| バケット列挙（〜500 objects） | 1 分以内 |
| DELETE（最悪ケース、100 objects） | 3 分以内 |
| 全体 | 5 分以内 |

### Test Cases（workflow 単体）

| 状況 | 期待挙動 |
|---|---|
| dry_run=true | DELETE が呼ばれず、候補リストだけログ出力 |
| dry_run=false、削除候補あり | 候補 object のみ DELETE される |
| 直近 N コミットすべての manifest 参照 hash | 削除候補にならない |
| 異常終了時 | 部分的にも削除した object はログに残す |

## ワークフロー間の依存

```text
[developer] git push → PR
                       ↓
              [tiles-deploy.yml] (PR job)
                       ↓
              tile 変更あり? ──no──→ build:check のみ
                       ↓ yes
                  DEV bucket diff upload
                       ↓
              [Cloudflare Pages preview]   ← GitHub 連携で別途自動生成
                       ↓
              レビュー / マージ
                       ↓
              [tiles-deploy.yml] (main push job)
                       ↓
              tile 変更あり? ──no──┐
                       ↓ yes        │
                  PROD bucket       │
                  diff upload       │
                       ↓            │
                       └────────────┤
                                    ↓
              [Pages Deploy Hook] (常に発火)
                       ↓
              [Cloudflare Pages production]

(月次)
[tiles-gc.yml] → 直近 N コミットの manifest を git log で取得
              → 保持集合と R2 列挙の diff で削除候補
              → dry_run / 本実行
```
