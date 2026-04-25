# Contract: R2 Bucket Object Layout

**Buckets**: `world-history-map-tiles-dev`, `world-history-map-tiles-prod`
**Owners**: Cloudflare R2、CI のみが書き込み

## Object Key Format

```text
world_{year}.{hash}.pmtiles
```

- `year`: 整数文字列（負数あり、`-` を許容）
- `hash`: 12 文字 hex（SHA-256 の先頭 12 文字）
- `.pmtiles`: 拡張子固定

階層なし（フラット）。prefix を使わない。

### Examples

```text
world_-1.a3f2c189bd03.pmtiles
world_1600.b8e4d9a2c1f0.pmtiles
world_2025.cd0192fea874.pmtiles
```

## Object Properties

| プロパティ | 値 |
|---|---|
| Content-Type | `application/octet-stream`（Worker が応答時にも維持） |
| Storage Class | デフォルト（standard） |
| Lifecycle Rules | なし（GC は workflow が担当） |
| Encryption | R2 の at-rest 暗号化（自動） |

## Worker からのアクセスパターン

- `GET /world_{year}.{hash}.pmtiles` — Range request あり / なしの両対応
- Worker は `env.BUCKET.get(key, { range })` で R2 から読み出し
- 移行期間中の `GET /manifest.json` は引き続き受け付け（Phase D で削除）

## バケット間の差異

| 項目 | DEV | PROD |
|---|---|---|
| 書き込みトリガ | `tiles-upload.yml` の PR job | `tiles-upload.yml` の main push job |
| 含まれる object | open PR / 過去 PR の HashedTile | main にマージされた commit の HashedTile（GC 窓内） |
| Public 経由 | 別 Worker route または同 Worker の `--env dev` で配信 | 既存 Worker（本番）で配信 |
| GC 対象 | dev | prod |

### Worker 配信ルートの分岐

Worker は `wrangler.toml` で 2 環境をもつ：

```toml
# 本番（既存）
[env.production]
[[env.production.r2_buckets]]
binding = "BUCKET"
bucket_name = "world-history-map-tiles-prod"

# プレビュー（新設）
[env.preview]
[[env.preview.r2_buckets]]
binding = "BUCKET"
bucket_name = "world-history-map-tiles-dev"
```

frontend は環境変数 `VITE_TILES_BASE_URL` で参照先 Worker の URL を切り替える。

## バケット作成・退役の段取り

| Phase | 操作 |
|---|---|
| C 開始 | `world-history-map-tiles-prod` / `-dev` を新規作成（空） |
| C 中 | 既存 `world-history-map-tiles` の object を `-prod` にコピー |
| C 完了 | frontend / Worker の参照先を `-prod` / `-dev` に切替 |
| D | 旧 `world-history-map-tiles` を退役（中身削除 → bucket 削除） |

## 不変条件

1. **B-1**: object key は `^world_-?\d+\.[0-9a-f]{12}\.pmtiles$` の正規表現に合致する
2. **B-2**: 同 key の object は内容（bytes）が一意（再 upload しても上書きしない、PUT は冪等）
3. **B-3**: PROD には main の直近 N コミットの manifest が参照する全 hash が存在する
4. **B-4**: GC は B-3 を満たした上でのみ削除を実行する

## Test Cases

| 状況 | 期待 |
|---|---|
| 不正な key（規約外）の上書き試行 | CI の差分 upload はそもそも生成しない |
| 同 key への再 PUT | 内容は変わらず（B-2）、upload step は skip 判定 |
| GC が B-3 を破る削除候補を出力 | テストで検出（保持集合に必須要素が含まれていることを assert） |
