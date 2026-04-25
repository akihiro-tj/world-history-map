# Contract: `@world-history-map/tiles` Public API

**Consumers**: `apps/frontend`（直接 import）、CI workflow（build 出力 / dist の upload）
**Stability**: workspace internal（外部公開なし）。破壊的変更は frontend と同 PR で同期更新する

## Exports

### `manifest`

```ts
export const manifest: Readonly<Record<string, string>>;
```

- key: 年（文字列、例 `"-1"`, `"1600"`, `"2025"`）
- value: 当該年の HashedTile ファイル名（例 `"world_1600.b8e4d9a2c1f0.pmtiles"`）
- `as const` 由来で keyof typeof 推論が効く

**Examples**:
```ts
import { manifest } from '@world-history-map/tiles';
const filename = manifest['1600']; // "world_1600.b8e4d9a2c1f0.pmtiles"
```

### `availableYears`

```ts
export const availableYears: readonly string[];
```

- `Object.keys(manifest)` を pre-computed なソート済み配列として export
- frontend の YearSelector が `index.json` の代替として参照可能（ただし `index.json` も維持）

### `getTilesUrl(year: string, baseUrl: string): string | null`

```ts
export function getTilesUrl(year: string, baseUrl: string): string | null;
```

- year に対応する PMTiles の完全 URL（`pmtiles://` 形式）を返す
- 該当年が manifest に存在しない場合は `null`
- baseUrl 末尾のスラッシュは関数内で正規化（呼び出し側で気にしない）
- `baseUrl` が空文字列のとき（dev mode 想定）は `pmtiles:///pmtiles/{filename}` を返す。frontend 側でこのパスを解決する仕組み（後述「Dev mode tile resolution」）が必要

**Examples**:
```ts
import { getTilesUrl } from '@world-history-map/tiles';

// 本番 / preview（VITE_TILES_BASE_URL が設定済み）
const url = getTilesUrl('1600', 'https://tiles.example.com');
// "pmtiles://https://tiles.example.com/world_1600.b8e4d9a2c1f0.pmtiles"

// dev mode（VITE_TILES_BASE_URL 未設定）
const devUrl = getTilesUrl('1600', '');
// "pmtiles:///pmtiles/world_1600.b8e4d9a2c1f0.pmtiles"
```

## Dev mode tile resolution

dev mode（`vite dev` / `vite preview` 起動時、`VITE_TILES_BASE_URL` 未設定）では、frontend は `pmtiles:///pmtiles/{filename}` という相対 URL でハッシュ付き PMTiles を要求する。
この URL を packages/tiles の dist 配下にマッピングするため、**frontend の `vite.config.ts` に dev 専用ミドルウェアを追加** する：

```ts
// apps/frontend/vite.config.ts
import sirv from 'sirv';
import path from 'node:path';

export default defineConfig({
  plugins: [
    {
      name: 'serve-tiles-dev',
      apply: 'serve',
      configureServer(server) {
        const tilesDist = path.resolve(__dirname, '../../packages/tiles/dist');
        server.middlewares.use('/pmtiles', sirv(tilesDist, { dev: true, etag: true }));
      },
    },
    react(),
    tailwindcss(),
  ],
  // ...
});
```

要件：
- `pnpm dev` 前に `packages/tiles/dist/` が存在している必要がある（`pnpm --filter @world-history-map/tiles run build` を `predev` script で先行実行）
- dev mode のみ有効（`apply: 'serve'`）。`vite build` には影響しない
- prod / preview ビルドでは `VITE_TILES_BASE_URL` が立っているため、このミドルウェアは未使用

## Build CLI

### `tiles-build`

`packages/tiles/src/build/build.ts` を実行可能スクリプトとして expose（`pnpm --filter @world-history-map/tiles run build`）。

**入力**:
- `packages/tiles/src/pmtiles/world_*.pmtiles`（git ls-files で取得した binary）

**出力**:
- `packages/tiles/dist/world_{year}.{hash}.pmtiles`（HashedTile）
- `packages/tiles/src/manifest.ts`（Manifest を上書き）

**Exit codes**:
- `0` — 成功
- `1` — 入力 binary 欠損 / hash 計算失敗
- `2` — 書き出し失敗

**冪等性**: 同一の入力 binary に対して同一の出力を生成する（テストで担保）

### `tiles-build --check`

書き出さず、現在の `manifest.ts` の内容と再計算した manifest が **一致するか** だけを検証する。
不一致なら exit 1（CI の Pre-commit / pre-merge gate に使う）。

**Exit codes**:
- `0` — `manifest.ts` が最新（再計算と一致）
- `1` — `manifest.ts` が古い（再 build 必要）

## Non-goals

- 外部公開（npm publish しない）
- runtime fetch ヘルパー（build-time import のみ）
- pmtiles の内部読み取り（pmtiles ライブラリの責務）

## Test Contract

| 項目 | 期待 |
|---|---|
| `manifest['1600']` | `world_1600.{12hex}.pmtiles` 形式で返る |
| `manifest['9999']` | undefined（型エラーで弾かれる） |
| `getTilesUrl('1600', 'https://x.test')` | `'pmtiles://https://x.test/world_1600.{hash}.pmtiles'` |
| `getTilesUrl('9999', '...')` | `null` |
| `getTilesUrl('1600', 'https://x.test/')` | trailing slash が正規化される |
| `getTilesUrl('1600', '')` | `'pmtiles:///pmtiles/world_1600.{hash}.pmtiles'`（dev mode 用相対 URL） |
| dev server で `/pmtiles/world_1600.{hash}.pmtiles` を fetch | `packages/tiles/dist/` から該当ファイルが返る（vite middleware 経由） |
| build 冪等性 | 同 binary 入力 → 同 dist output（バイト単位） |
| build 出力先 | `dist/` のみ書き換え、`src/` は manifest.ts のみ |
