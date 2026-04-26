# worker: Cloudflare Worker

> Last updated: 2026-04-26T00:00:00+09:00

## 役割

R2 バケットに置かれた PMTiles をクライアント（frontend）に配信する薄い Worker。ブラウザに対して直接 R2 を晒さず、CORS とキャッシュヘッダをここで統制する。HTTP Range Request を素通しで R2 の部分読み取りに橋渡しし、PMTiles プロトコルの「タイル単位で範囲を取る」アクセスパターンを成立させる。

タイルの年 → ハッシュ付きファイル名マッピング（manifest）は frontend のビルド時に `@world-history-map/tiles` から静的 import されるため、Worker が `/manifest.json` を配信する責務はなくなった（移行期間中のみ残置）。

## エンドポイント

`GET /*.pmtiles` — パスが `.pmtiles` で終わるリクエストを R2 のキーとして `BUCKET.get(filename)` に渡す。`Range` ヘッダがあれば `bytes=start-end` をパースして `{ offset, length }` を R2 に渡し、206 Partial Content で応答する。範囲なしリクエストは 200 で全バイト。

`POST *` は 405、それ以外のパスは 404 を即座に返す。

## キャッシュ戦略

- PMTiles ファイル — `Cache-Control: public, max-age=31536000, immutable`。ハッシュ付きファイル名が cache buster として機能するため、長期キャッシュして問題ない。Cloudflare のエッジ + ブラウザキャッシュで再訪時のバイト転送が最小化される
- 404（ファイルなし） — `public, max-age=60`

CORS ヘッダ（`Access-Control-Allow-Origin` と `Vary: Origin`）は R2 の結果本体とは独立に毎回 origin 判定してから付け直す。

## バインディングと環境

`wrangler.toml` で 3 環境を定義:

| 環境 | Worker 名 | R2 バケット | 用途 |
|---|---|---|---|
| デフォルト（旧） | `world-history-map-tiles` | `world-history-map-tiles` | 移行期間中の互換用（廃止予定） |
| `[env.production]` | `world-history-map-tiles-production` | `world-history-map-tiles-prod` | 本番 |
| `[env.preview]` | `world-history-map-tiles-preview` | `world-history-map-tiles-dev` | PR preview |

- `BUCKET` — R2 バインディング。`env.BUCKET.get(key, { range })` で叩く
- `ALLOWED_ORIGINS`（vars） — カンマ区切りの origin パターン。`https://*.world-history-map.pages.dev` 形式のワイルドカードをサポート

## 配信シナリオ

PMTiles タイルを要求したとき:
- MapLibre の PMTiles プロトコルが `Range: bytes=1234-5677` 形式でリクエストを出す
- Worker が `Range` ヘッダをパースして `{ offset: 1234, length: 4444 }` を組み立て、`env.BUCKET.get(filename, { range })` で R2 の部分読み取りを行う
- R2 から返る `obj.body` と `obj.range` を使って `Content-Range: bytes 1234-5677/<total>` を組み立て、206 で返す
- レスポンスには `Cache-Control: immutable` と `Accept-Ranges: bytes` が付く

存在しないファイルが要求されたとき:
- `env.BUCKET.get` が null を返す
- Worker は 404 を `Cache-Control: max-age=60` 付きで返す

## デプロイ

```bash
# 本番環境
pnpm --filter @world-history-map/worker run deploy -- --env production

# preview 環境
pnpm --filter @world-history-map/worker run deploy -- --env preview
```

本番 frontend のデプロイは `tiles-deploy.yml` が main push 時に Pages Deploy Hook を叩くことで行われる（Worker の直接 deploy は不要）。
