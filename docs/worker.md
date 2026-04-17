# worker: Cloudflare Worker

> Last updated: 2026-04-17T21:51:29+09:00

## 役割

R2 バケット `world-history-map-tiles` に置かれた PMTiles と `manifest.json` をクライアント（frontend）に配信する薄い Worker。ブラウザに対して直接 R2 を晒さず、CORS とキャッシュヘッダをここで統制する。HTTP Range Request を素通しで R2 の部分読み取りに橋渡しし、PMTiles プロトコルの「タイル単位で範囲を取る」アクセスパターンを成立させる。

## エンドポイント

`GET /manifest.json` — R2 の `manifest.json` を配信。年 → ハッシュ付きファイル名（`world_{year}.{hash}.pmtiles`）のマッピングが入っており、frontend が起動時に一度読む。内容が可変なので短い max-age とキャッシュに載せて返す。

`GET /*.pmtiles` — パスが `.pmtiles` で終わるリクエストを R2 のキーとして `BUCKET.get(filename)` に渡す。`Range` ヘッダがあれば `bytes=start-end` をパースして `{ offset, length }` を R2 に渡し、206 Partial Content で応答する。範囲なしリクエストは 200 で全バイト。

`POST *` は 405、それ以外のパスは 404 を即座に返す。

manifest と PMTiles の違い — manifest は「どの hash が現行か」を示すポインタで frequently-ish に変わる。PMTiles はファイル名自体に hash を持つため、一度作られたら内容は絶対に変わらない。このため片方は短寿命キャッシュ、片方は immutable で扱う。

## キャッシュ戦略

- `manifest.json` — `Cache-Control: public, max-age=300` + Cloudflare の `caches.default` に手動で put。Worker 内で `cache.match(request.url)` に当てて、ヒットすれば R2 を呼ばずに返す。新 manifest が R2 に入ってから最大 5 分でクライアントに伝搬する
- PMTiles ファイル — `Cache-Control: public, max-age=31536000, immutable`。ハッシュ付きファイル名が cache buster として機能するため、長期キャッシュして問題ない。Cloudflare のエッジ + ブラウザキャッシュで再訪時のバイト転送が最小化される
- 404（ファイルなし） — `public, max-age=60`。存在しない PMTiles を連打されても R2 への無駄な問い合わせが増えない程度に短く抑える

CORS ヘッダ（`Access-Control-Allow-Origin` と `Vary: Origin`）は R2 の結果本体とは独立に毎回 origin 判定してから付け直す。これは同じエッジキャッシュに複数 origin のリクエストが当たっても、正しい origin が返されるようにするため。

## バインディングと環境

`wrangler.toml` で定義:
- `BUCKET` — R2 バインディング。バケット名は `world-history-map-tiles`。Worker からは `env.BUCKET.get(key, { range })` で叩く
- `ALLOWED_ORIGINS`（vars） — カンマ区切りの origin パターン。`*` だけのワイルドカード全許可、完全一致、ドメインのサブドメイン 1 階層（`https://*.example.pages.dev`）に対応

origin マッチは `matchesPattern` が担う。`*` が含まれる場合はドットをエスケープし `*` を `[^.]+` に置換した RegExp を作って 1 回だけ判定する。`Origin` ヘッダが無いリクエストや許可リストに無い origin の場合、CORS ヘッダ自体を付けず（`Vary: Origin` だけは付く）、ブラウザ側で拒否させる。

`compatibility_date = "2025-12-01"` / `minify = true`。POST を明示的に 405 で塞ぐ以外は認証やレート制限を持たない、読み取り専用の軽量プロキシ。

## 配信シナリオ

frontend が manifest を要求して R2 まで届くまで:
- ブラウザが `GET /manifest.json` を Worker に送る
- Worker が `caches.default` を照会。5 分以内に同じ URL を処理していれば R2 を経由せずに応答本体を返し、CORS だけ付け直す
- ミスなら `env.BUCKET.get('manifest.json')` で R2 から `R2ObjectBody` を取得し、本体を text 化して `Cache-Control: max-age=300` 付きで返す
- 同時に `ctx.waitUntil(cache.put(...))` で Cloudflare エッジにコピーを入れておく。次の同一 origin リクエストはキャッシュから返る

PMTiles タイルを要求したとき:
- MapLibre の PMTiles プロトコルが `Range: bytes=1234-5677` 形式でリクエストを出す
- Worker が `Range` ヘッダをパースして `{ offset: 1234, length: 4444 }` を組み立て、`env.BUCKET.get(filename, { range })` で R2 の部分読み取りを行う
- R2 から返る `obj.body` と `obj.range` を使って `Content-Range: bytes 1234-5677/<total>` を組み立て、206 で返す
- レスポンスには `Cache-Control: immutable` と `Accept-Ranges: bytes` が付く。同じ Range は Cloudflare エッジで再利用される

存在しないファイルが要求されたとき:
- `env.BUCKET.get` が null を返す
- Worker は 404 を `Cache-Control: max-age=60` 付きで返す。CORS ヘッダは付いているので、クライアント側はネットワークエラーではなく 404 としてハンドルできる
