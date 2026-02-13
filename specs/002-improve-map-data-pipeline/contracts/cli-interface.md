# CLI Interface Contract

パイプラインの CLI インターフェース仕様。pnpm scripts 経由で実行される。

## Entry Point

```bash
# package.json scripts
"pipeline": "tsx src/pipeline/cli.ts"
```

## Commands

### `pnpm pipeline run` (default)

全ステージを順番に実行する。

```bash
pnpm pipeline run [options]
```

**Options**:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--year <year>` | number | (all) | 特定の年のみ処理 |
| `--years <from>..<to>` | string | (all) | 年範囲を指定（例: `1600..1800`） |
| `--restart` | boolean | false | チェックポイントを無視してクリーンスタート |
| `--dry-run` | boolean | false | 変更を加えずに何が実行されるか表示 |
| `--skip-upload` | boolean | false | アップロードステージをスキップ |
| `--verbose` | boolean | false | 詳細ログを出力 |

**Examples**:

```bash
# 全年度を処理（差分処理: 変更されたファイルのみ）
pnpm pipeline run

# 1650年のみ処理
pnpm pipeline run --year 1650

# 1600年から1800年の範囲を処理
pnpm pipeline run --years 1600..1800

# チェックポイントを無視してゼロから開始
pnpm pipeline run --restart

# ドライラン（何が実行されるか確認）
pnpm pipeline run --dry-run

# アップロードなしでローカル処理のみ
pnpm pipeline run --skip-upload
```

### `pnpm pipeline <stage>`

個別のステージを独立して実行する (FR-007)。

```bash
pnpm pipeline fetch [options]
pnpm pipeline merge [options]
pnpm pipeline validate [options]
pnpm pipeline convert [options]
pnpm pipeline prepare [options]
pnpm pipeline upload [options]
pnpm pipeline index [options]
```

各ステージコマンドも `--year`, `--years`, `--verbose` オプションをサポート。

### `pnpm pipeline status`

パイプラインの現在の状態を表示する。

```bash
pnpm pipeline status
```

**Output**:

```
Pipeline State: completed
Last run: 2026-02-13T10:30:00.000Z (run-id: 2026-02-13T10:30:00.000Z-x7k2)
Years processed: 53/53

Year   Source  Merge  Validate  Convert  Prepare  Upload
-1000  ok      ok     ok        ok       ok       ok
1600   ok      ok     ok        ok       ok       ok
1650   ok      ok     ok        FAILED   -        -
...
```

### `pnpm pipeline list`

利用可能な年度一覧を表示する。

```bash
pnpm pipeline list
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | 成功 |
| 1 | パイプラインエラー（バリデーション失敗、変換エラー等） |
| 2 | 同時実行エラー（ロック取得失敗） |
| 3 | 設定エラー（tippecanoe 未インストール等） |

## Logging Format

```
[HH:MM:SS] [STAGE] message
[10:30:05] [fetch]    Fetching historical-basemaps (git pull)...
[10:30:10] [merge]    Processing year 1650 (42 features)...
[10:30:11] [validate] Year 1650: 42 features, 0 errors, 2 warnings
[10:30:25] [convert]  Year 1650: tippecanoe completed (14.2s)
[10:30:26] [prepare]  Year 1650: world_1650.a1b2c3d4.pmtiles (SHA-256)
[10:30:30] [upload]   Year 1650: uploaded (9.8MB)
[10:30:30] [upload]   Year 1700: skipped (unchanged)
```

## Stage Execution Order

```
1. fetch     → git clone/pull historical-basemaps
2. merge     → per-year: merge same-name polygons
3. validate  → per-year: validate merged GeoJSON
4. convert   → per-year: tippecanoe + tile-join
5. prepare   → per-year: SHA-256 hash + copy to dist/
6. index     → generate index.json from all years
7. upload    → per-year: diff deploy to R2 + manifest
```
