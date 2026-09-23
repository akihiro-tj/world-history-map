# 世界史地図 MVP 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 世界史の都市 10 件を MapLibre の地図上で検索・選択して確かめられる Web アプリを、Cloudflare Workers（静的アセット + R2 中継）に PR プレビュー付きでデプロイできる状態にする。

**Architecture:** React + Vite の SPA を単一の Cloudflare Worker の静的アセットとして配信する。ベースマップ（PMTiles）と都市データ（JSON）はデプロイ時に内容ハッシュ付きのキーで R2 に置き、Worker が `/tiles/*` と `/data/*` を Range 対応で中継する。アプリは `asset-manifest.json` で論理名からハッシュ付き URL を解決する。開発時は Vite プラグインがローカルパスを指す manifest を返す。

**Tech Stack:** Node 24 / pnpm 12.5.1 / React 19.3 / Vite 8.3 / TypeScript 7.0 / Tailwind CSS 4.3 / maplibre-gl 6.11 / pmtiles 4.5 / Vitest 5.0 / Biome 2.5 / wrangler 4.136 / @google/design.md 0.4 / tippecanoe / GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-23-world-history-map-design.md`（実装前に必ず読む。この計画は spec を根拠にしている）

## Global Constraints

- 言語: コミットメッセージは英語。UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語
- UI 文言は spec §7 の一覧にあるものだけを使う。一覧は `src/app/copy.ts` と `index.html`（`<title>`・noscript）にしか書かない。新しい文言が必要になったら実装を止めてユーザーに確認する
- `index.html` に入れる head 要素は `charset`・`viewport`・`<title>世界史地図</title>` だけ。meta description・OGP・favicon・robots.txt・canonical は作らない
- 地図の帰属表示は出さない（`attributionControl: false`）
- デザイントークンは `DESIGN.md` の front matter だけを編集する。色・角丸・余白の値を Tailwind のクラスや MapLibre のスタイルに直接書かない（`src/app/theme.css` は `pnpm tokens` の生成物）
- 依存パッケージは exact 指定（`.npmrc` の `save-exact=true`）。バージョンは Task 1 の表のとおり
- npm script に `deploy` という名前を付けない（pnpm 組み込みコマンドに取られる）
- R2 バケット名は `whm-assets`、Worker 名は `world-history-map`、R2 バインディング名は `ASSETS_BUCKET`
- ハッシュ付きキーは `<dir>/<name>.<sha256 先頭 12 桁>.<ext>`。R2 のアセットは `Cache-Control: public, max-age=31536000, immutable`、`asset-manifest.json` は `no-cache`
- E2E テストは作らない。UI は実ブラウザ（Chromium の headless を含む）で確認する
- テスト環境は Vitest の `node` 環境のみ（jsdom は入れない）。ロジックは純関数に切り出して unit test する
- 計画に書かれたテストの期待値が観測値と食い違ったら、期待値を観測値に合わせて書き換えず、BLOCKED として報告する
- データは「正確性 > 網羅性」「不確かなら載せない」

## Review Focus

- 日本語 IME の変換確定の Enter で、候補が勝手に決定される → 変換中（`isComposing` または keyCode 229）のキー入力では何もしない（Task 10 のテスト）
- 満たせない Range や不正な Range を受け取った → Worker は 500 ではなく `416` と `Content-Range: bytes */<size>` を返す（Task 2 のテスト）
- Tailwind v4 が未使用のテーマ変数を削り、地図の色（`--color-ocean` 等）が空になる → `@theme static` で出力し、`readMapColors` は空の変数を検出したら例外を投げる（Task 8・Task 11 のテスト）
- manifest や都市データの取得に失敗した → 画面が真っ白にならず、spec §7 のエラー文言を表示する（Task 9 のテスト）
- 半角カナ・カタカナ・前後の空白・全角空白だけの入力 → 同じ候補になる。空白だけなら候補も「該当なし」も出さない（Task 10 のテスト）

## ファイル構成

```
flake.nix                         # devShell: nodejs_24, pnpm, tippecanoe
.node-version                     # 24.21.0（CI の setup-node が読む）
package.json / pnpm-lock.yaml / pnpm-workspace.yaml / .npmrc
biome.json / tsconfig.json / tsconfig.worker.json / vite.config.ts / vitest.config.ts
wrangler.jsonc / .env.op
index.html
DESIGN.md / CLAUDE.md / .claude/rules/{data,worker,ui}.md
public/
  _headers / .assetsignore
  tiles/world.pmtiles             # 生成物（ハッシュなしの原本）
  data/cities.json                # 都市データ（原本）
scripts/
  build-tiles.sh                  # Natural Earth → world.pmtiles
  verify-tiles.ts                 # world.pmtiles のヘッダー検証
  publish-assets.ts               # R2 へのアップロードと dist/asset-manifest.json 出力
  tokens.ts                       # DESIGN.md → src/app/theme.css
  smoke.sh                        # デプロイ先の動作確認（preview / deploy 共通）
  lib/assetKeys.ts (+test)        # ハッシュ付きキー、Content-Type
  lib/tilesCheck.ts (+test)       # タイルの検証ルール
  lib/themeCss.ts (+test)         # design.md の出力を Tailwind 用に補正
vite/plugins/assetManifestDev.ts (+test)
src/
  main.tsx
  app/App.tsx, app/copy.ts, app/index.css, app/theme.css(生成物), app/SelectionPanel.tsx, app/ErrorBanner.tsx
  app/loadAppData.ts (+test)
  assets/logicalAssets.ts, assets/manifest.ts (+test)
  data/city.ts (+test)            # City 型と実行時検証。public/data/cities.json もここでテスト
  search/normalize.ts, search/match.ts (+test), search/combobox.ts (+test), search/SearchBox.tsx
  map/style.ts (+test), map/citiesGeoJSON.ts (+test), map/bounds.ts (+test), map/MapView.tsx
  worker/index.ts, worker/serve.ts (+test)
.github/workflows/{ci,preview,deploy}.yml / .github/dependabot.yml
```

## タスク一覧（★ はユーザー対話が必要）

1. リポジトリの土台
2. Worker（R2 中継と Range 対応）
3. アセット公開スクリプトと wrangler 設定
4. ベースマップの生成
5. CI・プレビュー・本番デプロイ・dependabot
6. ★ Cloudflare の準備とスパイク（PR 作成、プレビューで実機検証）
7. ★ 都市データ（座標の確認はユーザー）
8. ★ DESIGN.md とトークン生成（Artifact モックのレビュー）
9. manifest の解決とデータ読み込み
10. 検索ロジック
11. 地図表示
12. 検索窓・選択パネル・画面の組み立て
13. CLAUDE.md と `.claude/rules`
14. ★ 最終確認（全体レビュー、実機確認、マージ、本番、dependabot）

依存関係: 1 → 2 → 3 → 4 → 5 → 6。7・8 は 1 の後ならいつでもよい（8 のモックレビューは 11・12 より前）。9 は 3 と 7 の後。10 は 7 の後。11 は 8・9 の後。12 は 10・11 の後。13・14 は最後。

---

### Task 1: リポジトリの土台

**Files:**
- Create: `flake.nix`, `.node-version`, `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `biome.json`, `tsconfig.json`, `tsconfig.worker.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/index.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: なし
- Produces: npm scripts `dev` / `build` / `preview` / `lint` / `format` / `typecheck` / `test`。`src/app/App.tsx` の `export function App(): JSX.Element`。`src/app/index.css`（後続タスクが `@import "./theme.css";` を追記する）

- [ ] **Step 1: 設定ファイルを作る**

`.node-version`:

```
24.21.0
```

`.npmrc`:

```
save-exact=true
```

`flake.nix`（`flake.lock` は nix のある端末でユーザーが Task 6 で生成する。このコンテナに nix は無い）:

```nix
{
  description = "世界史地図の開発環境";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          # pnpm は package.json の packageManager に書いた版へ自動で切り替わる
          packages = [
            pkgs.nodejs_24
            pkgs.pnpm
            pkgs.tippecanoe
          ];
        };
      });
    };
}
```

`package.json`（依存はまだ書かない。Step 2 で追加する）:

```json
{
  "name": "world-history-map",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.5.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc -p tsconfig.json && tsc -p tsconfig.worker.json",
    "test": "vitest run"
  }
}
```

`pnpm-workspace.yaml`（Step 2 の install で必要な設定をここに足す）:

```yaml
# pnpm の設定。ビルドスクリプトの許可などをここで管理する
```

`.gitignore` の末尾に追記する（既存の `.env.*` が `.env.op` を無視してしまうので例外を足す）:

```
# 世界史地図
!.env.op
.wrangler/
.tiles-cache/
.dev.vars
CLAUDE.local.md
```

- [ ] **Step 2: 依存を exact 指定で入れる**

このコンテナの pnpm は 10 系だが、`packageManager` を読んで 12.5.1 に自動で切り替わる。

```bash
pnpm add -E react@19.3.0 react-dom@19.3.0 maplibre-gl@6.11.0 pmtiles@4.5.0
pnpm add -E -D vite@8.3.0 @vitejs/plugin-react@6.1.1 typescript@7.0.2 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest@5.0.1 @biomejs/biome@2.5.14 wrangler@4.136.3 @google/design.md@0.4.0 @cloudflare/workers-types@5.20260923.1 tsx@4.23.15 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24.13.6
pnpm --version
```

Expected: `pnpm --version` が `12.5.1`。

- install が minimumReleaseAge（公開直後のパッケージを拒否する設定）で失敗した場合: spec §10 の方針（minimumReleaseAge は使わず、公開直後の制御は dependabot の cooldown で行う）に従い、`pnpm-workspace.yaml` に `minimumReleaseAge: 0` を書いて再実行する。
- 「Ignored build scripts」と表示された場合: 表示されたうち `esbuild` と `workerd` だけを許可する。pnpm 12 での設定キーは `pnpm help approve-builds` で確認し、`pnpm-workspace.yaml` に書く。それ以外のパッケージは許可しない。

- [ ] **Step 3: TypeScript・Vite・Vitest・Biome の設定を書く**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite", "vite.config.ts", "vitest.config.ts"],
  "exclude": ["src/worker"]
}
```

`tsconfig.worker.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/worker"]
}
```

`vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "vite/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
```

`biome.json`（`.claude/` の superpowers 同梱スクリプトと、生成物の `theme.css` は対象外にする）:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!.claude", "!src/app/theme.css", "!apm.lock.yaml"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "css": { "parser": { "tailwindDirectives": true } }
}
```

`$schema` のパスやキー名が Biome 2.5.14 と合わないとエラーが出たら、`pnpm exec biome migrate --write` で直す。

- [ ] **Step 4: 最小の画面を作る**

`index.html`（文言は spec §7 のとおり。head に他の要素を足さない）:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>世界史地図</title>
  </head>
  <body>
    <noscript>このページを表示するには JavaScript を有効にしてください</noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/app/index.css`:

```css
@import "tailwindcss";
```

`src/app/App.tsx`:

```tsx
export function App() {
  return <div className="h-dvh w-full" />;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root が見つかりません");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: 検査がすべて通ることを確認する**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: すべて成功。`dist/index.html` ができる。TypeScript 7 で周辺ツールとの互換問題（tsc が動かない等）が出たら BLOCKED として報告する（6.x に下げる判断はユーザーと spec の更新が必要）。

- [ ] **Step 6: コミットする**

```bash
git add .
git commit -m "Scaffold React + Vite + Tailwind app with Biome, Vitest and nix devShell"
```

---

### Task 2: Worker（R2 中継と Range 対応）

**Files:**
- Create: `src/worker/serve.ts`, `src/worker/index.ts`
- Test: `src/worker/serve.test.ts`

**Interfaces:**
- Consumes: なし（`@cloudflare/workers-types` のグローバル型 `R2Bucket` / `R2Object` / `R2ObjectBody` / `R2Range`）
- Produces:
  - `keyFromPath(pathname: string): string | null`
  - `resolveRange(range: R2Range | undefined, size: number): ByteRange | null`（`type ByteRange = { start: number; end: number }`）
  - `serveFromBucket(request: Request, bucket: R2Bucket): Promise<Response>`
  - `src/worker/index.ts` の default export（`ExportedHandler<Env>`、`interface Env { ASSETS: Fetcher; ASSETS_BUCKET: R2Bucket }`）

- [ ] **Step 1: 失敗するテストを書く**

`src/worker/serve.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { keyFromPath, resolveRange, serveFromBucket } from "./serve";

const CONTENT = "0123456789";
const SIZE = CONTENT.length;

type FakeOptions = { range?: R2Range; withBody?: boolean };

function fakeObject({ range, withBody = true }: FakeOptions = {}): R2Object | R2ObjectBody {
  const base = {
    key: "tiles/world.abc123abc123.pmtiles",
    size: SIZE,
    etag: "etag-1",
    httpEtag: '"etag-1"',
    range,
    writeHttpMetadata(headers: Headers) {
      headers.set("Content-Type", "application/vnd.pmtiles");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    },
  };
  if (!withBody) {
    return base as unknown as R2Object;
  }
  const resolved = resolveRange(range, SIZE);
  const text = resolved ? CONTENT.slice(resolved.start, resolved.end + 1) : CONTENT;
  return { ...base, body: new Response(text).body } as unknown as R2ObjectBody;
}

type FakeBucket = { get: ReturnType<typeof vi.fn>; head: ReturnType<typeof vi.fn> };

function fakeBucket(overrides: Partial<FakeBucket> = {}): FakeBucket & R2Bucket {
  const bucket: FakeBucket = {
    get: vi.fn(async () => fakeObject()),
    head: vi.fn(async () => fakeObject({ withBody: false })),
    ...overrides,
  };
  return bucket as unknown as FakeBucket & R2Bucket;
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, init);
}

describe("keyFromPath", () => {
  it("tiles/ と data/ 配下のファイル名だけをキーとして返す", () => {
    expect(keyFromPath("/tiles/world.abc123abc123.pmtiles")).toBe("tiles/world.abc123abc123.pmtiles");
    expect(keyFromPath("/data/cities.abc123abc123.json")).toBe("data/cities.abc123abc123.json");
  });

  it("それ以外のパスは null を返す", () => {
    expect(keyFromPath("/")).toBeNull();
    expect(keyFromPath("/index.html")).toBeNull();
    expect(keyFromPath("/tiles/")).toBeNull();
    expect(keyFromPath("/tiles/a/b.pmtiles")).toBeNull();
    expect(keyFromPath("/tiles/..pmtiles")).toBeNull();
  });
});

describe("resolveRange", () => {
  it("offset と length から終端を計算する", () => {
    expect(resolveRange({ offset: 2, length: 3 }, SIZE)).toEqual({ start: 2, end: 4 });
  });

  it("length が無ければ末尾までにする", () => {
    expect(resolveRange({ offset: 7 }, SIZE)).toEqual({ start: 7, end: 9 });
  });

  it("suffix は末尾からの長さとして扱い、サイズを超えたら全体にする", () => {
    expect(resolveRange({ suffix: 4 }, SIZE)).toEqual({ start: 6, end: 9 });
    expect(resolveRange({ suffix: 100 }, SIZE)).toEqual({ start: 0, end: 9 });
  });

  it("length がサイズを超えたら末尾で切る", () => {
    expect(resolveRange({ offset: 8, length: 100 }, SIZE)).toEqual({ start: 8, end: 9 });
  });

  it("range が無いか、サイズが 0 なら null を返す", () => {
    expect(resolveRange(undefined, SIZE)).toBeNull();
    expect(resolveRange({ offset: 0, length: 1 }, 0)).toBeNull();
  });
});

describe("serveFromBucket", () => {
  it("GET と HEAD 以外は 405 を返す", async () => {
    const response = await serveFromBucket(request("/tiles/world.abc123abc123.pmtiles", { method: "POST" }), fakeBucket());
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("対象外のパスは R2 を見ずに 404 を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(request("/secret.txt"), bucket);
    expect(response.status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("Range が無い GET は 200 で全体を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(request("/tiles/world.abc123abc123.pmtiles"), bucket);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(CONTENT);
    expect(response.headers.get("Content-Length")).toBe(String(SIZE));
    expect(response.headers.get("ETag")).toBe('"etag-1"');
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Type")).toBe("application/vnd.pmtiles");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("リクエストヘッダーを range と onlyIf にそのまま渡す", async () => {
    const bucket = fakeBucket();
    const req = request("/tiles/world.abc123abc123.pmtiles", { headers: { Range: "bytes=0-3" } });
    await serveFromBucket(req, bucket);
    expect(bucket.get).toHaveBeenCalledWith("tiles/world.abc123abc123.pmtiles", {
      range: req.headers,
      onlyIf: req.headers,
    });
  });

  it("Range 付きの GET は 206 と Content-Range を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ range: { offset: 0, length: 4 } })) });
    const response = await serveFromBucket(
      request("/tiles/world.abc123abc123.pmtiles", { headers: { Range: "bytes=0-3" } }),
      bucket,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 0-3/${SIZE}`);
    expect(response.headers.get("Content-Length")).toBe("4");
    expect(await response.text()).toBe("0123");
  });

  it("suffix の Range も 206 で返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ range: { suffix: 4 } })) });
    const response = await serveFromBucket(
      request("/tiles/world.abc123abc123.pmtiles", { headers: { Range: "bytes=-4" } }),
      bucket,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 6-9/${SIZE}`);
  });

  it("R2 が Range を満たせず例外を投げたら 416 と全体サイズを返す", async () => {
    const bucket = fakeBucket({
      get: vi.fn(async () => {
        throw new Error("The requested range is not satisfiable");
      }),
    });
    const response = await serveFromBucket(
      request("/tiles/world.abc123abc123.pmtiles", { headers: { Range: "bytes=999-1000" } }),
      bucket,
    );
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe(`bytes */${SIZE}`);
  });

  it("Range が無いのに R2 が例外を投げたら、そのまま投げ直す", async () => {
    const bucket = fakeBucket({
      get: vi.fn(async () => {
        throw new Error("R2 の障害");
      }),
    });
    await expect(serveFromBucket(request("/tiles/world.abc123abc123.pmtiles"), bucket)).rejects.toThrow("R2 の障害");
  });

  it("キーが無ければ 404 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => null) });
    const response = await serveFromBucket(request("/data/cities.abc123abc123.json"), bucket);
    expect(response.status).toBe(404);
  });

  it("If-None-Match の条件で本文が無ければ 304 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ withBody: false })) });
    const response = await serveFromBucket(
      request("/tiles/world.abc123abc123.pmtiles", { headers: { "If-None-Match": '"etag-1"' } }),
      bucket,
    );
    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe('"etag-1"');
  });

  it("If-Match の条件を満たさなければ 412 を返す", async () => {
    const bucket = fakeBucket({ get: vi.fn(async () => fakeObject({ withBody: false })) });
    const response = await serveFromBucket(
      request("/tiles/world.abc123abc123.pmtiles", { headers: { "If-Match": '"other"' } }),
      bucket,
    );
    expect(response.status).toBe(412);
  });

  it("HEAD は本文なしで 200 と Content-Length を返す", async () => {
    const bucket = fakeBucket();
    const response = await serveFromBucket(request("/tiles/world.abc123abc123.pmtiles", { method: "HEAD" }), bucket);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe(String(SIZE));
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("HEAD でキーが無ければ 404 を返す", async () => {
    const bucket = fakeBucket({ head: vi.fn(async () => null) });
    const response = await serveFromBucket(request("/tiles/world.abc123abc123.pmtiles", { method: "HEAD" }), bucket);
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/worker/serve.test.ts`
Expected: FAIL（`./serve` が見つからない）

- [ ] **Step 3: 実装する**

`src/worker/serve.ts`:

```ts
// R2 に置いたハッシュ付きアセット（タイル・都市データ）を Range 対応で返す

const KEY_PATTERN = /^(?:tiles|data)\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

export type ByteRange = { start: number; end: number };

export function keyFromPath(pathname: string): string | null {
  const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return KEY_PATTERN.test(key) ? key : null;
}

export function resolveRange(range: R2Range | undefined, size: number): ByteRange | null {
  if (range === undefined || size === 0) {
    return null;
  }
  if ("suffix" in range) {
    const length = Math.min(range.suffix, size);
    return { start: size - length, end: size - 1 };
  }
  const start = range.offset ?? 0;
  const end = range.length === undefined ? size - 1 : Math.min(start + range.length, size) - 1;
  return { start, end };
}

function metadataHeaders(object: R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  return headers;
}

export async function serveFromBucket(request: Request, bucket: R2Bucket): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const key = keyFromPath(new URL(request.url).pathname);
  if (key === null) {
    return new Response(null, { status: 404 });
  }

  if (request.method === "HEAD") {
    const object = await bucket.head(key);
    if (object === null) {
      return new Response(null, { status: 404 });
    }
    const headers = metadataHeaders(object);
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  const hasRange = request.headers.has("Range");
  let object: R2ObjectBody | R2Object | null;
  try {
    object = await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  } catch (error) {
    // R2 は満たせない Range を例外で知らせるので、サイズを調べて 416 にする
    if (!hasRange) {
      throw error;
    }
    const head = await bucket.head(key);
    if (head === null) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${head.size}` } });
  }
  if (object === null) {
    return new Response(null, { status: 404 });
  }

  const headers = metadataHeaders(object);
  if (!("body" in object)) {
    // onlyIf の条件を満たさなかったので本文が無い
    const notModified = request.headers.has("If-None-Match") || request.headers.has("If-Modified-Since");
    return new Response(null, { status: notModified ? 304 : 412, headers });
  }

  const range = hasRange ? resolveRange(object.range, object.size) : null;
  if (range === null) {
    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${object.size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  return new Response(object.body, { status: 206, headers });
}
```

`src/worker/index.ts`:

```ts
import { serveFromBucket } from "./serve";

export interface Env {
  ASSETS: Fetcher;
  ASSETS_BUCKET: R2Bucket;
}

// 静的アセットに一致しないリクエストと、run_worker_first に指定したパスだけがここに来る
export default {
  async fetch(request, env): Promise<Response> {
    return serveFromBucket(request, env.ASSETS_BUCKET);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/worker/serve.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add src/worker
git commit -m "Add worker that serves hashed R2 assets with HTTP Range support"
```

---

### Task 3: アセット公開スクリプトと wrangler 設定

**Files:**
- Create: `src/assets/logicalAssets.ts`, `scripts/lib/assetKeys.ts`, `scripts/publish-assets.ts`, `wrangler.jsonc`, `public/_headers`, `public/.assetsignore`, `public/data/cities.json`（仮。Task 7 で本物にする）
- Test: `scripts/lib/assetKeys.test.ts`
- Modify: `package.json`（scripts）

**Interfaces:**
- Consumes: なし
- Produces:
  - `src/assets/logicalAssets.ts`: `TILES_ASSET = "tiles/world.pmtiles"`, `CITIES_ASSET = "data/cities.json"`, `LOGICAL_ASSET_PATHS: readonly ["tiles/world.pmtiles", "data/cities.json"]`
  - `scripts/lib/assetKeys.ts`: `R2_BUCKET = "whm-assets"`, `IMMUTABLE_CACHE_CONTROL`, `hashedKey(logicalPath: string, content: Uint8Array): string`, `contentTypeFor(logicalPath: string): string`
  - `pnpm publish:assets [--dry-run]` が `dist/asset-manifest.json` を出力する
  - npm scripts `deploy:cf` / `preview:cf` / `dev:secrets`

- [ ] **Step 1: 失敗するテストを書く**

`scripts/lib/assetKeys.test.ts`:

```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentTypeFor, hashedKey, IMMUTABLE_CACHE_CONTROL, R2_BUCKET } from "./assetKeys";

describe("hashedKey", () => {
  const content = new TextEncoder().encode("hello");
  const hash12 = createHash("sha256").update(content).digest("hex").slice(0, 12);

  it("拡張子の直前に sha256 の先頭 12 桁を挟む", () => {
    expect(hashedKey("tiles/world.pmtiles", content)).toBe(`tiles/world.${hash12}.pmtiles`);
    expect(hashedKey("data/cities.json", content)).toBe(`data/cities.${hash12}.json`);
  });

  it("内容が変わればキーも変わる", () => {
    const other = new TextEncoder().encode("hello!");
    expect(hashedKey("data/cities.json", other)).not.toBe(hashedKey("data/cities.json", content));
  });

  it("拡張子の無いパスは例外にする", () => {
    expect(() => hashedKey("tiles/world", content)).toThrow();
  });
});

describe("contentTypeFor", () => {
  it("拡張子から Content-Type を決める", () => {
    expect(contentTypeFor("tiles/world.pmtiles")).toBe("application/vnd.pmtiles");
    expect(contentTypeFor("data/cities.json")).toBe("application/json; charset=utf-8");
  });

  it("知らない拡張子は例外にする", () => {
    expect(() => contentTypeFor("data/cities.csv")).toThrow();
  });
});

describe("設定の整合", () => {
  it("R2 のキャッシュ設定は immutable の長期キャッシュ", () => {
    expect(IMMUTABLE_CACHE_CONTROL).toBe("public, max-age=31536000, immutable");
  });

  it("wrangler.jsonc のバケット名と一致する", () => {
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    expect(wrangler).toContain(`"bucket_name": "${R2_BUCKET}"`);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test scripts/lib/assetKeys.test.ts`
Expected: FAIL（`./assetKeys` が見つからない）

- [ ] **Step 3: 実装と設定を書く**

`src/assets/logicalAssets.ts`:

```ts
// デプロイ時にハッシュ付きで R2 に置くアセットの論理名（public/ からの相対パス）
export const TILES_ASSET = "tiles/world.pmtiles";
export const CITIES_ASSET = "data/cities.json";
export const LOGICAL_ASSET_PATHS = [TILES_ASSET, CITIES_ASSET] as const;
```

`scripts/lib/assetKeys.ts`:

```ts
import { createHash } from "node:crypto";

// wrangler.jsonc の r2_buckets と同じ名前にする（テストで一致を確認している）
export const R2_BUCKET = "whm-assets";
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES: Record<string, string> = {
  pmtiles: "application/vnd.pmtiles",
  json: "application/json; charset=utf-8",
};

function splitExtension(logicalPath: string): { stem: string; ext: string } {
  const dot = logicalPath.lastIndexOf(".");
  if (dot <= logicalPath.lastIndexOf("/")) {
    throw new Error(`拡張子がありません: ${logicalPath}`);
  }
  return { stem: logicalPath.slice(0, dot), ext: logicalPath.slice(dot + 1) };
}

export function hashedKey(logicalPath: string, content: Uint8Array): string {
  const { stem, ext } = splitExtension(logicalPath);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `${stem}.${hash}.${ext}`;
}

export function contentTypeFor(logicalPath: string): string {
  const { ext } = splitExtension(logicalPath);
  const type = CONTENT_TYPES[ext];
  if (type === undefined) {
    throw new Error(`Content-Type が未定義の拡張子です: ${ext}`);
  }
  return type;
}
```

`scripts/publish-assets.ts`:

```ts
// public/ のアセットをハッシュ付きキーで R2 に置き、dist/asset-manifest.json を書き出す
// --dry-run のときはアップロードせず manifest だけを書く
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { LOGICAL_ASSET_PATHS } from "../src/assets/logicalAssets";
import { contentTypeFor, hashedKey, IMMUTABLE_CACHE_CONTROL, R2_BUCKET } from "./lib/assetKeys";

const dryRun = process.argv.includes("--dry-run");
const manifest: Record<string, string> = {};

for (const logicalPath of LOGICAL_ASSET_PATHS) {
  const file = `public/${logicalPath}`;
  const key = hashedKey(logicalPath, readFileSync(file));
  if (!dryRun) {
    execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "r2",
        "object",
        "put",
        `${R2_BUCKET}/${key}`,
        "--file",
        file,
        "--content-type",
        contentTypeFor(logicalPath),
        "--cache-control",
        IMMUTABLE_CACHE_CONTROL,
        "--remote",
      ],
      { stdio: "inherit" },
    );
  }
  manifest[logicalPath] = `/${key}`;
}

writeFileSync("dist/asset-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(dryRun ? "manifest だけを書き出しました" : "R2 へのアップロードと manifest の書き出しが完了しました");
```

`wrangler.jsonc`（404 は Worker が返すので `not_found_handling` は指定しない）:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "world-history-map",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-23",
  // workers.dev の本番 URL とプレビュー URL をどちらも明示的に有効にする
  "workers_dev": true,
  "preview_urls": true,
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    // R2 に置いたアセットは静的アセットより先に Worker で処理する
    "run_worker_first": ["/tiles/*", "/data/*"]
  },
  "r2_buckets": [{ "binding": "ASSETS_BUCKET", "bucket_name": "whm-assets" }],
  // Worker Previews は本番の設定を引き継がないので、バインディングを書き直す
  "previews": {
    "r2_buckets": [{ "binding": "ASSETS_BUCKET", "bucket_name": "whm-assets" }]
  },
  "observability": { "enabled": true }
}
```

`public/_headers`:

```
/asset-manifest.json
  Cache-Control: no-cache
```

`public/.assetsignore`（R2 から配信するので静的アセットとしてはアップロードしない）:

```
tiles/
data/
```

`public/data/cities.json`（Task 7 で差し替える仮データ）:

```json
[]
```

`package.json` の `scripts` に追加する:

```json
"publish:assets": "tsx scripts/publish-assets.ts",
"deploy:cf": "pnpm build && pnpm publish:assets && wrangler deploy",
"preview:cf": "pnpm build && pnpm publish:assets && wrangler preview",
"dev:secrets": "op run --env-file=.env.op --"
```

- [ ] **Step 4: テストと dry-run が通ることを確認する**

`public/tiles/world.pmtiles` はまだ無いので、manifest の dry-run は Task 4 の後に確認する。ここでは次を実行する。

```bash
pnpm test scripts/lib/assetKeys.test.ts && pnpm typecheck && pnpm lint
pnpm build && pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run
```

Expected: テストが PASS。wrangler の出力に `env.ASSETS_BUCKET (whm-assets)` と `env.ASSETS` が表示され、`--dry-run: exiting now.` で終わる。

- [ ] **Step 5: コミットする**

```bash
git add src/assets scripts wrangler.jsonc public package.json
git commit -m "Add asset publishing script and wrangler config for R2-backed assets"
```

---

### Task 4: ベースマップの生成

**Files:**
- Create: `scripts/build-tiles.sh`, `scripts/lib/tilesCheck.ts`, `scripts/verify-tiles.ts`, `public/tiles/world.pmtiles`（生成物）
- Test: `scripts/lib/tilesCheck.test.ts`
- Modify: `package.json`（scripts）

**Interfaces:**
- Consumes: なし
- Produces: `public/tiles/world.pmtiles`（ソースレイヤー `land`・`coastline`、z0–6、MVT）。npm scripts `tiles:build` / `tiles:verify`。`checkTiles(input: TilesFacts): string[]`

- [ ] **Step 1: 失敗するテストを書く**

`scripts/lib/tilesCheck.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkTiles, EXPECTED_TILES, type TilesFacts } from "./tilesCheck";

const valid: TilesFacts = {
  minZoom: 0,
  maxZoom: EXPECTED_TILES.maxZoom,
  tileType: 1,
  layerIds: ["land", "coastline"],
  sizeBytes: 5 * 1024 * 1024,
};

describe("checkTiles", () => {
  it("条件を満たせば問題なし", () => {
    expect(checkTiles(valid)).toEqual([]);
  });

  it("ズーム範囲の違いを指摘する", () => {
    expect(checkTiles({ ...valid, maxZoom: 7 })).toHaveLength(1);
    expect(checkTiles({ ...valid, minZoom: 1 })).toHaveLength(1);
  });

  it("MVT 以外を指摘する", () => {
    expect(checkTiles({ ...valid, tileType: 2 })).toHaveLength(1);
  });

  it("足りないソースレイヤーを指摘する", () => {
    expect(checkTiles({ ...valid, layerIds: ["land"] })).toEqual([
      "ソースレイヤー coastline がありません",
    ]);
  });

  it("15 MiB 以上なら指摘する", () => {
    expect(checkTiles({ ...valid, sizeBytes: 15 * 1024 * 1024 })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test scripts/lib/tilesCheck.test.ts`
Expected: FAIL（`./tilesCheck` が見つからない）

- [ ] **Step 3: 検証ロジックと検証スクリプトを書く**

`scripts/lib/tilesCheck.ts`:

```ts
// 生成した world.pmtiles が spec §4 の条件を満たすかを調べる

export const EXPECTED_TILES = {
  minZoom: 0,
  // 15 MiB を超えて 5 に下げたときは、build-tiles.sh と spec §4 も合わせて直す
  maxZoom: 6,
  layers: ["land", "coastline"],
  maxBytes: 15 * 1024 * 1024,
} as const;

// pmtiles の TileType.Mvt
const MVT_TILE_TYPE = 1;

export type TilesFacts = {
  minZoom: number;
  maxZoom: number;
  tileType: number;
  layerIds: string[];
  sizeBytes: number;
};

export function checkTiles(facts: TilesFacts): string[] {
  const problems: string[] = [];
  if (facts.minZoom !== EXPECTED_TILES.minZoom) {
    problems.push(`minZoom が ${facts.minZoom} です（期待値 ${EXPECTED_TILES.minZoom}）`);
  }
  if (facts.maxZoom !== EXPECTED_TILES.maxZoom) {
    problems.push(`maxZoom が ${facts.maxZoom} です（期待値 ${EXPECTED_TILES.maxZoom}）`);
  }
  if (facts.tileType !== MVT_TILE_TYPE) {
    problems.push(`タイル形式が MVT ではありません（${facts.tileType}）`);
  }
  for (const layer of EXPECTED_TILES.layers) {
    if (!facts.layerIds.includes(layer)) {
      problems.push(`ソースレイヤー ${layer} がありません`);
    }
  }
  if (facts.sizeBytes >= EXPECTED_TILES.maxBytes) {
    problems.push(`ファイルサイズが ${facts.sizeBytes} バイトで上限を超えています`);
  }
  return problems;
}
```

`scripts/verify-tiles.ts`:

```ts
// world.pmtiles のヘッダーとメタデータを読み、checkTiles の条件を満たすか調べる
import { open, stat } from "node:fs/promises";
import { PMTiles, type RangeResponse, type Source } from "pmtiles";
import { checkTiles } from "./lib/tilesCheck";

class NodeFileSource implements Source {
  constructor(private readonly path: string) {}

  getKey(): string {
    return this.path;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const handle = await open(this.path);
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, offset);
      const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + bytesRead) as ArrayBuffer;
      return { data };
    } finally {
      await handle.close();
    }
  }
}

function layerIdsOf(metadata: unknown): string[] {
  if (typeof metadata !== "object" || metadata === null || !("vector_layers" in metadata)) {
    return [];
  }
  const layers = (metadata as { vector_layers: unknown }).vector_layers;
  if (!Array.isArray(layers)) {
    return [];
  }
  return layers.flatMap((layer: unknown) => {
    const id = typeof layer === "object" && layer !== null ? (layer as { id?: unknown }).id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}

const path = process.argv[2];
if (path === undefined) {
  throw new Error("使い方: tsx scripts/verify-tiles.ts <pmtiles のパス>");
}
const archive = new PMTiles(new NodeFileSource(path));
const header = await archive.getHeader();
const problems = checkTiles({
  minZoom: header.minZoom,
  maxZoom: header.maxZoom,
  tileType: header.tileType,
  layerIds: layerIdsOf(await archive.getMetadata()),
  sizeBytes: (await stat(path)).size,
});
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`${path} は条件を満たしています`);
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test scripts/lib/tilesCheck.test.ts && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: 生成スクリプトを書く**

`scripts/build-tiles.sh`（sha256 は 2026-09-23 に取得したファイルから計算した値）:

```bash
#!/usr/bin/env bash
# Natural Earth の陸地・海岸線から public/tiles/world.pmtiles を生成する
# nix devShell（tippecanoe）で実行する: nix develop -c pnpm tiles:build
set -euo pipefail
cd "$(dirname "$0")/.."

NE_TAG="v5.1.2"
BASE_URL="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_TAG}/geojson"
CACHE_DIR=".tiles-cache"
OUT="public/tiles/world.pmtiles"

declare -A SHA256=(
  [ne_110m_land.geojson]=9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9
  [ne_110m_coastline.geojson]=851f581ff5ffb844deed8ae1a9ce22e3c4bb3d74fa342cadb5d8e39b41ae7c3c
  [ne_50m_land.geojson]=e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b
  [ne_50m_coastline.geojson]=271f1c4c1908312bac6b29d158ea1356544beafc129f260005300913aa5ea283
  [ne_10m_land.geojson]=1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416
  [ne_10m_coastline.geojson]=6f75ae0e0de157b14946e2255eb1f5486d9a13819032e26d4610852d296788f6
)

sha256_of() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

mkdir -p "$CACHE_DIR" "$(dirname "$OUT")"
for file in "${!SHA256[@]}"; do
  if [[ ! -f "$CACHE_DIR/$file" ]]; then
    curl -fsSL "$BASE_URL/$file" -o "$CACHE_DIR/$file.tmp"
    mv "$CACHE_DIR/$file.tmp" "$CACHE_DIR/$file"
  fi
  actual="$(sha256_of "$CACHE_DIR/$file")"
  if [[ "$actual" != "${SHA256[$file]}" ]]; then
    echo "sha256 が一致しません: $file ($actual)" >&2
    exit 1
  fi
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 縮尺ごとにズーム範囲を分けて作り、最後に 1 つにまとめる
build_scale() {
  local scale="$1" minzoom="$2" maxzoom="$3"
  tippecanoe -o "$tmp/$scale.pmtiles" --force --quiet \
    -Z"$minzoom" -z"$maxzoom" \
    -L "land:$CACHE_DIR/ne_${scale}_land.geojson" \
    -L "coastline:$CACHE_DIR/ne_${scale}_coastline.geojson" \
    --exclude-all --no-tile-size-limit --no-feature-limit --detect-shared-borders
}

build_scale 110m 0 1
build_scale 50m 2 3
build_scale 10m 4 6

tile-join -o "$OUT" --force --quiet --no-tile-size-limit \
  "$tmp/110m.pmtiles" "$tmp/50m.pmtiles" "$tmp/10m.pmtiles"

echo "生成しました: $OUT ($(wc -c <"$OUT") バイト)"
```

`package.json` の `scripts` に追加する:

```json
"tiles:build": "bash scripts/build-tiles.sh && pnpm tiles:verify",
"tiles:verify": "tsx scripts/verify-tiles.ts public/tiles/world.pmtiles"
```

- [ ] **Step 6: タイルを生成する**

nix がある場合は `nix develop -c pnpm tiles:build`。このクラウドコンテナのように nix が無い場合は、apt の tippecanoe を使う（版が違うので生成物は nix 版と少し異なる。このことをコミットメッセージに書く）。

```bash
command -v nix && nix develop -c pnpm tiles:build || { sudo apt-get install -y tippecanoe || apt-get install -y tippecanoe; pnpm tiles:build; }
tippecanoe --version
ls -la public/tiles/world.pmtiles
```

Expected: 最後に `public/tiles/world.pmtiles は条件を満たしています` と出る。15 MiB 以上で失敗したら、`build_scale 10m 4 6` を `4 5` に、`EXPECTED_TILES.maxZoom` を `5` に変え、spec §4 の表も直して再実行する。

- [ ] **Step 7: manifest の dry-run を確認する**

```bash
pnpm build && pnpm publish:assets --dry-run && cat dist/asset-manifest.json
```

Expected: `"tiles/world.pmtiles": "/tiles/world.<12 桁>.pmtiles"` と `"data/cities.json": "/data/cities.<12 桁>.json"` が出る。

- [ ] **Step 8: コミットする**

```bash
git add scripts package.json public/tiles/world.pmtiles
git commit -m "Build Natural Earth land/coastline basemap as PMTiles (tippecanoe <version>)"
```

`<version>` は Step 6 の `tippecanoe --version` の値に置き換える。

---

### Task 5: CI・プレビュー・本番デプロイ・dependabot

**Files:**
- Create: `scripts/smoke.sh`, `.github/workflows/ci.yml`, `.github/workflows/preview.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: npm scripts（Task 1・3・4）、`dist/asset-manifest.json` の形式（Task 3）
- Produces: `bash scripts/smoke.sh <base-url>`。Task 8 で `ci.yml` に design.md lint とトークンの差分確認を足す。Task 6 で `deploy.yml` の `PRODUCTION_URL` を確定させる

actions は次の commit SHA で固定する（2026-09-23 に `git ls-remote` で確認）。

| action | tag | SHA |
|---|---|---|
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | v7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| pnpm/action-setup | v6.1.0 | `ea17c68df8912ef543352723c149a84f56e3d413` |

- [ ] **Step 1: スモークテストを書く**

`scripts/smoke.sh`:

```bash
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
```

- [ ] **Step 2: CI を書く**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  check:
    name: 検査とビルド
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec biome ci .
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm publish:assets --dry-run
      - run: pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run
```

- [ ] **Step 3: プレビューを書く**

`.github/workflows/preview.yml`（dependabot と fork からの PR には Secrets が渡らないので実行しない）:

```yaml
name: プレビュー
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
env:
  PREVIEW_NAME: pr-${{ github.event.pull_request.number }}
jobs:
  deploy:
    name: プレビューをデプロイ
    if: >-
      github.event.action != 'closed' &&
      github.actor != 'dependabot[bot]' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish:assets
      - id: preview
        name: Worker Preview を作る
        run: |
          pnpm exec wrangler preview --name "$PREVIEW_NAME" --json > preview.json
          cat preview.json
          url="$(jq -r '.preview_urls[0] // .preview.urls[0] // empty' preview.json)"
          test -n "$url"
          echo "url=$url" >> "$GITHUB_OUTPUT"
      - name: スモークテスト
        run: bash scripts/smoke.sh "${{ steps.preview.outputs.url }}"
      - name: PR にプレビュー URL をコメント
        env:
          GH_TOKEN: ${{ github.token }}
          URL: ${{ steps.preview.outputs.url }}
          SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          gh pr comment "${{ github.event.pull_request.number }}" --repo "${{ github.repository }}" \
            --edit-last --create-if-none \
            --body "プレビュー: $URL（コミット ${SHA:0:7}）"
  cleanup:
    name: プレビューを削除
    if: >-
      github.event.action == 'closed' &&
      github.actor != 'dependabot[bot]' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec wrangler preview delete --name "$PREVIEW_NAME" --skip-confirmation
```

- [ ] **Step 4: 本番デプロイを書く**

`.github/workflows/deploy.yml`（`PRODUCTION_URL` の workers.dev サブドメインは Task 6 でユーザーから受け取って書き換える。それまで本番デプロイは動かない）:

```yaml
name: 本番デプロイ
on:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: production
  cancel-in-progress: false
env:
  PRODUCTION_URL: https://world-history-map.SUBDOMAIN_FROM_TASK_6.workers.dev
jobs:
  deploy:
    name: 本番にデプロイ
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm publish:assets
      - run: pnpm exec wrangler deploy
      - name: スモークテスト
        run: bash scripts/smoke.sh "$PRODUCTION_URL"
```

- [ ] **Step 5: dependabot を書く**

`.github/dependabot.yml`（公開直後の版を避けるのは cooldown で行う。pnpm の minimumReleaseAge は使わない）:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      timezone: Asia/Tokyo
    cooldown:
      default-days: 7
      semver-major-days: 14
    groups:
      dev-dependencies:
        dependency-type: development
      production-dependencies:
        dependency-type: production
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      timezone: Asia/Tokyo
    cooldown:
      default-days: 7
```

- [ ] **Step 6: ローカルで確認できる範囲を確認する**

```bash
bash -n scripts/smoke.sh
for f in .github/workflows/*.yml .github/dependabot.yml; do python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "OK $f"; done
pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build && pnpm publish:assets --dry-run && pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run
```

Expected: すべて成功（ワークフローの実際の動作は Task 6 で確認する）

- [ ] **Step 7: コミットする**

```bash
git add scripts/smoke.sh .github
git commit -m "Add CI, PR preview, production deploy workflows and dependabot config"
```

---

### Task 6: ★ Cloudflare の準備とスパイク

**このタスクはコントローラー（メインのセッション）が行う。サブエージェントに渡さない。**

**Files:**
- Create: `.env.op`
- Modify: `.github/workflows/deploy.yml`（`PRODUCTION_URL`）、`docs/superpowers/specs/2026-09-23-world-history-map-design.md`（§12 に結果を書く）、`flake.lock`（ユーザーが生成）

**Interfaces:**
- Consumes: Task 1–5 の成果物
- Produces: 動作が確認できたプレビュー環境と PR。確定した `PRODUCTION_URL`

- [ ] **Step 1: ★ ユーザーに準備を依頼する**

次のメッセージをユーザーに送り、完了の返事を待つ。

> Cloudflare と GitHub の準備をお願いします。
> 1. Cloudflare で API トークンを作成する（権限: アカウントの「Workers Scripts: Edit」と「Workers R2 Storage: Edit」）
> 2. GitHub のリポジトリ Secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録する
> 3. 1Password にトークンとアカウント ID を保存し、それぞれの `op://` 参照を教えてください（`.env.op` に書きます）
> 4. 手元の端末で R2 バケットを作成する: `op run --env-file=.env.op -- pnpm exec wrangler r2 bucket create whm-assets`（`.env.op` は 3 の後に私が push します）
> 5. workers.dev のサブドメイン（`<subdomain>.workers.dev` の `<subdomain>`）を教えてください
> 6. nix のある端末で `nix flake lock` を実行し、`flake.lock` をこのブランチにコミットしてください

- [ ] **Step 2: 受け取った値を反映する**

`.env.op`（Step 1 の 3 で受け取った参照をそのまま書く。値そのものは書かない）:

```
CLOUDFLARE_API_TOKEN=<受け取った op:// 参照>
CLOUDFLARE_ACCOUNT_ID=<受け取った op:// 参照>
```

`deploy.yml` の `SUBDOMAIN_FROM_TASK_6` を受け取ったサブドメインに置き換える。

```bash
git add .env.op .github/workflows/deploy.yml
git commit -m "Add 1Password secret references and production URL"
git push -u origin claude/world-history-map-app-ti91oc
```

- [ ] **Step 3: PR をドラフトで作り、プレビューを動かす**

`.github/pull_request_template.md` があれば構成を合わせる。無ければ次の本文で、GitHub MCP の `create_pull_request`（draft: true、base: main）を使って作る。

- タイトル: `世界史地図 MVP`
- 本文: 概要（spec へのリンク）、現状（Task 1–5 まで）、確認したこと、未完了のタスク

PR を作ったら、PR の CI・レビューを監視するかどうかをユーザーに尋ねる。

- [ ] **Step 4: スパイクの確認項目を順に確かめる**

1. `プレビュー` ワークフローが成功し、PR にプレビュー URL のコメントが付いているか（GitHub MCP の `actions_list` / `get_job_logs` で確認する）。`wrangler preview` の JSON から URL を取り出せなければ、ログの `cat preview.json` の中身に合わせて jq の式を直す
2. スモークテストの 206・強い ETag・416・都市データの 200 が通っているか
3. 失敗した場合の切り分け:
   - Worker が存在しないというエラー → ユーザーに手元で一度 `pnpm dev:secrets pnpm deploy:cf` を実行してもらう（本番に空に近いアプリが出ることを先に伝える）
   - 権限エラー → トークンに必要な権限を調べてユーザーに追加を依頼する
   - Worker Previews が使えない → spec §12 のとおり `wrangler versions upload --preview-alias` に切り替える（ワークフローを直す前にユーザーに相談する）
   - ETag が弱い形になる → Cloudflare の圧縮が原因かを調べる（pmtiles の Cache-Control に `no-transform` を足す案をユーザーに相談する）
4. dependabot が pnpm 12 のロックファイルを扱えるかは main にマージした後でないと確認できないので、Task 14 で確かめる

- [ ] **Step 5: 結果を spec に書く**

spec §12 の表の後に「スパイクの結果（YYYY-MM-DD）」を追記する（各項目: 確認したこと・結果・対応）。

```bash
git add docs/superpowers/specs/2026-09-23-world-history-map-design.md
git commit -m "Record spike results for R2 range serving and Worker Previews"
git push
```

---

### Task 7: ★ 都市データ

**Files:**
- Create: `src/data/city.ts`
- Modify: `public/data/cities.json`
- Test: `src/data/city.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type City = { id: string; name: string; reading: string; type: "city"; lon: number; lat: number; source: string }`
  - `parseCities(value: unknown): City[]`（不正なら日本語メッセージの Error を投げる）

- [ ] **Step 1: 失敗するテストを書く**

`src/data/city.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCities } from "./city";

const valid = {
  id: "samarkand",
  name: "サマルカンド",
  reading: "さまるかんど",
  type: "city",
  lon: 66.9597,
  lat: 39.6542,
  source: "https://ja.wikipedia.org/wiki/サマルカンド",
};

describe("parseCities", () => {
  it("正しいデータをそのまま返す", () => {
    expect(parseCities([valid])).toEqual([valid]);
  });

  it("配列でなければ例外にする", () => {
    expect(() => parseCities({})).toThrow("配列");
  });

  it("id の重複を例外にする", () => {
    expect(() => parseCities([valid, valid])).toThrow("重複");
  });

  it("読みにカタカナが入っていたら例外にする", () => {
    expect(() => parseCities([{ ...valid, reading: "サマルカンド" }])).toThrow("reading");
  });

  it("読みは長音符と半角空白区切りを許す", () => {
    expect(parseCities([{ ...valid, reading: "えみーる" }])).toHaveLength(1);
    expect(parseCities([{ ...valid, reading: "くちゃ きじ" }])).toHaveLength(1);
  });

  it("経度・緯度の範囲外を例外にする", () => {
    expect(() => parseCities([{ ...valid, lon: 181 }])).toThrow("lon");
    expect(() => parseCities([{ ...valid, lat: -91 }])).toThrow("lat");
  });

  it("空の名前・出典なし・知らないキーを例外にする", () => {
    expect(() => parseCities([{ ...valid, name: " " }])).toThrow("name");
    expect(() => parseCities([{ ...valid, source: "" }])).toThrow("source");
    expect(() => parseCities([{ ...valid, note: "x" }])).toThrow("note");
  });

  it("type は city だけを許す", () => {
    expect(() => parseCities([{ ...valid, type: "river" }])).toThrow("type");
  });
});

describe("public/data/cities.json", () => {
  const cities = parseCities(JSON.parse(readFileSync("public/data/cities.json", "utf8")));

  it("MVP の 10 都市がそろっている", () => {
    expect(cities.map((city) => city.id).sort()).toEqual(
      ["almaliq", "bukhara", "dadu", "dunhuang", "emil", "karakorum", "kucha", "samarkand", "sarai", "tabriz"],
    );
  });

  it("表示名が spec §2 のとおり", () => {
    expect(Object.fromEntries(cities.map((city) => [city.id, city.name]))).toEqual({
      samarkand: "サマルカンド",
      bukhara: "ブハラ",
      dunhuang: "敦煌",
      kucha: "クチャ（亀茲）",
      karakorum: "カラコルム（和林）",
      dadu: "大都",
      emil: "エミール",
      almaliq: "アルマリク",
      sarai: "サライ",
      tabriz: "タブリーズ",
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/data/city.test.ts`
Expected: FAIL（`./city` が見つからない）

- [ ] **Step 3: 検証ロジックを実装する**

`src/data/city.ts`:

```ts
// 都市データの型と、JSON を読み込むときの実行時検証

export type City = {
  id: string;
  name: string;
  reading: string;
  type: "city";
  lon: number;
  lat: number;
  source: string;
};

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
// ひらがな・長音符。複数の読みは半角空白 1 つで区切る
const READING_PATTERN = /^[ぁ-ゖー]+(?: [ぁ-ゖー]+)*$/;
const KEYS = new Set(["id", "name", "reading", "type", "lon", "lat", "source"]);

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseCity(item: unknown, index: number): City {
  const fail = (reason: string): never => {
    throw new Error(`都市データ ${index + 1} 件目: ${reason}`);
  };
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return fail("オブジェクトではありません");
  }
  for (const key of Object.keys(item)) {
    if (!KEYS.has(key)) {
      fail(`知らないキー ${key} があります`);
    }
  }
  const { id, name, reading, type, lon, lat, source } = item as Record<string, unknown>;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return fail("id が不正です");
  if (typeof name !== "string" || name.trim() === "") return fail("name が空です");
  if (typeof reading !== "string" || !READING_PATTERN.test(reading)) {
    return fail("reading はひらがな・長音符・半角空白だけで書きます");
  }
  if (type !== "city") return fail("type は city だけです");
  if (!inRange(lon, -180, 180)) return fail("lon が範囲外です");
  if (!inRange(lat, -90, 90)) return fail("lat が範囲外です");
  if (typeof source !== "string" || !source.startsWith("https://")) {
    return fail("source には https の URL を書きます");
  }
  return { id, name, reading, type, lon, lat, source };
}

export function parseCities(value: unknown): City[] {
  if (!Array.isArray(value)) {
    throw new Error("都市データは配列である必要があります");
  }
  const ids = new Set<string>();
  return value.map((item, index) => {
    const city = parseCity(item, index);
    if (ids.has(city.id)) {
      throw new Error(`都市データの id が重複しています: ${city.id}`);
    }
    ids.add(city.id);
    return city;
  });
}
```

- [ ] **Step 4: 都市データを書く**

`public/data/cities.json`（座標は**候補値**。このコンテナからは Wikipedia に接続できないので、Step 6 でユーザーに確認してもらう。出典は日本語版 Wikipedia の記事）:

```json
[
  { "id": "samarkand", "name": "サマルカンド", "reading": "さまるかんど", "type": "city", "lon": 66.9597, "lat": 39.6542, "source": "https://ja.wikipedia.org/wiki/サマルカンド" },
  { "id": "bukhara", "name": "ブハラ", "reading": "ぶはら", "type": "city", "lon": 64.4286, "lat": 39.7747, "source": "https://ja.wikipedia.org/wiki/ブハラ" },
  { "id": "dunhuang", "name": "敦煌", "reading": "とんこう", "type": "city", "lon": 94.662, "lat": 40.1421, "source": "https://ja.wikipedia.org/wiki/敦煌市" },
  { "id": "kucha", "name": "クチャ（亀茲）", "reading": "くちゃ きじ", "type": "city", "lon": 82.9333, "lat": 41.7167, "source": "https://ja.wikipedia.org/wiki/亀茲" },
  { "id": "karakorum", "name": "カラコルム（和林）", "reading": "からこるむ わりん", "type": "city", "lon": 102.8481, "lat": 47.2086, "source": "https://ja.wikipedia.org/wiki/カラコルム" },
  { "id": "dadu", "name": "大都", "reading": "だいと", "type": "city", "lon": 116.3833, "lat": 39.9, "source": "https://ja.wikipedia.org/wiki/大都" },
  { "id": "emil", "name": "エミール", "reading": "えみーる", "type": "city", "lon": 83.642, "lat": 46.527, "source": "https://ja.wikipedia.org/wiki/エミル" },
  { "id": "almaliq", "name": "アルマリク", "reading": "あるまりく", "type": "city", "lon": 80.8333, "lat": 44.05, "source": "https://ja.wikipedia.org/wiki/アルマリク" },
  { "id": "sarai", "name": "サライ", "reading": "さらい", "type": "city", "lon": 47.43, "lat": 47.17, "source": "https://ja.wikipedia.org/wiki/サライ_(都市)" },
  { "id": "tabriz", "name": "タブリーズ", "reading": "たぶりーず", "type": "city", "lon": 46.2919, "lat": 38.08, "source": "https://ja.wikipedia.org/wiki/タブリーズ" }
]
```

- [ ] **Step 5: テストが通ることを確認してコミットする**

```bash
pnpm format && pnpm test src/data/city.test.ts && pnpm typecheck && pnpm lint
git add src/data public/data/cities.json
git commit -m "Add city data schema validation and candidate data for 10 MVP cities"
```

- [ ] **Step 6: ★ 座標をユーザーに確認してもらう（コントローラーが行う）**

各都市の座標と、地図で確認できる URL（`https://www.openstreetmap.org/?mlat=<lat>&mlon=<lon>#map=10/<lat>/<lon>`）と出典 URL を表にしてユーザーに送る。確認してほしい点も添える。

- 遺跡や歴史的中心地を指しているか（カラコルムはハルホリン近郊の遺跡、サライはセリトレンノエ付近、大都は元代の城の位置）
- 出典の記事が正しいか（特に `エミル`・`サライ_(都市)` の記事名）

直す値を受け取ったら `public/data/cities.json` を更新し、テストを通して `Fix city coordinates after review` でコミットする。確かめられない都市があれば、spec の「不確かなら載せない」に従い、除外するかどうかをユーザーに確認する（除外したらテストの id 一覧も直す）。

---

### Task 8: ★ DESIGN.md とトークン生成

**Files:**
- Create: `DESIGN.md`, `scripts/lib/themeCss.ts`, `scripts/tokens.ts`, `src/app/theme.css`（生成物）
- Test: `scripts/lib/themeCss.test.ts`
- Modify: `src/app/index.css`, `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: なし
- Produces:
  - Tailwind のユーティリティ: `bg-surface` `text-on-surface` `text-muted` `border-border` `bg-highlight` `bg-error-surface` `text-on-error-surface` `bg-ocean` `rounded-sm|md|lg` `p-/gap-/m-` の `xs|sm|md|lg` `font-body` `text-body|label|title`
  - CSS 変数 `--color-ocean` `--color-land` `--color-coastline` `--color-city` `--color-city-selected`（Task 11 が読む）
  - `toThemeCss(exported: string): string`、`formatFontFamily(value: string): string`
  - `pnpm tokens`

トークンの**名前**はこの計画で固定する。**値**は Step 1 のモックレビューで変わってもよい。

- [ ] **Step 1: ★ デザインのモックをレビューしてもらう（コントローラーが行う）**

コントローラーは `artifact-design` スキルを読み込み、次のトークン案を使った HTML モックを Artifact で公開する（private）。モックに含めるもの:

- PC 幅: 左上に検索窓（候補が開いた状態と「該当する地名がありません」の状態）、右上に選択パネル（「サマルカンド」）
- スマートフォン幅（375px）: 上部の検索窓、下部のシート状の選択パネル
- 地図部分は海・陸・海岸線・都市の点（通常・選択中）の色が分かる簡単な図
- エラー表示（「地図の読み込みに失敗しました」）
- 文言は spec §7 の一覧だけを使う

トークン案（DESIGN.md の front matter）:

```yaml
version: alpha
name: 世界史地図
description: 世界史の地名を地図で確かめるための、装飾を抑えたシンプルなデザイン
colors:
  primary: "#1f3a5f"
  surface: "#ffffff"
  on-surface: "#1f2328"
  muted: "#5b6570"
  border: "#d5dbe1"
  highlight: "#e8eef5"
  error-surface: "#fdecea"
  on-error-surface: "#8a1c12"
  ocean: "#dce8f0"
  land: "#f5f3ec"
  coastline: "#8a9aa6"
  city: "#b4462b"
  city-selected: "#1f3a5f"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  search-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  suggestion-active:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.primary}"
  suggestion-empty:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  selection-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  panel-border:
    backgroundColor: "{colors.border}"
  error-banner:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.on-error-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  map-ocean:
    backgroundColor: "{colors.ocean}"
  map-land:
    backgroundColor: "{colors.land}"
  map-coastline:
    backgroundColor: "{colors.coastline}"
  map-city:
    backgroundColor: "{colors.city}"
  map-city-selected:
    backgroundColor: "{colors.city-selected}"
```

ユーザーの修正を反映してモックを更新し、承認を得るまで Step 2 に進まない。

- [ ] **Step 2: 失敗するテストを書く**

`scripts/lib/themeCss.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatFontFamily, toThemeCss } from "./themeCss";

describe("formatFontFamily", () => {
  it("フォント名は引用符で囲み、総称ファミリーは囲まない", () => {
    expect(formatFontFamily("Hiragino Sans, Noto Sans JP, sans-serif")).toBe(
      '"Hiragino Sans", "Noto Sans JP", sans-serif',
    );
    expect(formatFontFamily("system-ui, sans-serif")).toBe("system-ui, sans-serif");
  });
});

describe("toThemeCss", () => {
  const exported = [
    "@theme {",
    "  --color-ocean: #dce8f0;",
    '  --font-body: "system-ui, sans-serif";',
    "  --font-weight-body: 400;",
    "}",
    "",
  ].join("\n");

  it("未使用の変数も出力されるよう @theme static にする", () => {
    expect(toThemeCss(exported)).toContain("@theme static {");
    expect(toThemeCss(exported)).not.toContain("@theme {");
  });

  it("フォントの並びを CSS として正しい形に直す", () => {
    expect(toThemeCss(exported)).toContain("  --font-body: system-ui, sans-serif;");
  });

  it("フォントの太さはそのまま残す", () => {
    expect(toThemeCss(exported)).toContain("  --font-weight-body: 400;");
  });

  it("生成物であることを先頭に書く", () => {
    expect(toThemeCss(exported).startsWith("/* DESIGN.md から pnpm tokens で生成")).toBe(true);
  });

  it("@theme ブロックが無ければ例外にする", () => {
    expect(() => toThemeCss(":root {}")).toThrow("@theme");
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test scripts/lib/themeCss.test.ts`
Expected: FAIL（`./themeCss` が見つからない）

- [ ] **Step 4: 実装する**

`scripts/lib/themeCss.ts`:

```ts
// design.md export --format css-tailwind の出力を Tailwind v4 でそのまま使える形に直す
// - フォントの並び全体が 1 つの名前として引用符で囲まれるので、名前ごとに囲み直す
// - @theme のままだと未使用の変数が出力されず、地図の色を CSS 変数から読めないので static にする

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

export function formatFontFamily(value: string): string {
  return value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family !== "")
    .map((family) => (GENERIC_FAMILIES.has(family) ? family : `"${family}"`))
    .join(", ");
}

export function toThemeCss(exported: string): string {
  if (!exported.includes("@theme {")) {
    throw new Error("design.md の出力に @theme ブロックがありません");
  }
  const body = exported
    .replace(
      /^(\s*--font-(?!weight-)[\w-]+:\s*)"([^"]*)";$/gm,
      (_match, prefix: string, value: string) => `${prefix}${formatFontFamily(value)};`,
    )
    .replace("@theme {", "@theme static {")
    .trimEnd();
  return `/* DESIGN.md から pnpm tokens で生成したファイル。直接編集しない */\n${body}\n`;
}
```

`scripts/tokens.ts`:

```ts
// DESIGN.md のトークンから src/app/theme.css を生成する
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { toThemeCss } from "./lib/themeCss";

const exported = execFileSync(
  "pnpm",
  ["exec", "design.md", "export", "--format", "css-tailwind", "DESIGN.md"],
  { encoding: "utf8" },
);
writeFileSync("src/app/theme.css", toThemeCss(exported));
console.log("src/app/theme.css を生成しました");
```

- [ ] **Step 5: DESIGN.md を書く**

front matter は Step 1 で承認された値にする。本文の見出しは仕様の順序（Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts）に従い、次の内容を日本語で書く。

- Overview: 受験生・学習者が地名の位置を確かめるための画面。装飾を抑え、地図を主役にする
- Colors: 各色の役割（`ocean`・`land`・`coastline` は地図、`city` は通常の都市、`city-selected` は選択中の都市。UI は `surface`・`on-surface`・`muted`・`border`・`highlight`。エラーは `error-surface`・`on-error-surface`）
- Typography: `body` は検索窓と候補、`label` は補足（該当なし）、`title` は選択パネルの都市名
- Layout: 全画面の地図に検索窓と選択パネルを重ねる。PC（768px 以上）は検索窓を左上（幅 24rem まで）、選択パネルを右上（幅 18rem）。スマートフォンは検索窓を上部、選択パネルを下部のシート。外側の余白は `md`
- Elevation & Depth: 検索窓・候補・選択パネル・エラー表示に弱い影を 1 段だけ付ける（Tailwind の `shadow-md`）
- Shapes: 検索窓と候補は `md`、選択パネルは `lg`、エラー表示は `sm`
- Components: front matter の各コンポーネントの用途
- Do's and Don'ts: 地図の上にラベルを出さない / §7 にない文言を足さない / 色を直接書かずトークンを使う

- [ ] **Step 6: トークンを生成して読み込む**

`package.json` の `scripts` に追加する:

```json
"tokens": "tsx scripts/tokens.ts"
```

`src/app/index.css`:

```css
@import "tailwindcss";
@import "./theme.css";
```

```bash
pnpm exec design.md lint DESIGN.md
pnpm tokens
cat src/app/theme.css
```

Expected: lint にエラーが無い（警告は内容を確認し、トークン名の誤りなら直す）。`theme.css` が `@theme static {` で始まり、`--color-ocean` などがすべて出力され、`--font-body: system-ui, sans-serif;` になっている。

- [ ] **Step 7: CI に DESIGN.md の検査を足す**

`.github/workflows/ci.yml` の `- run: pnpm test` の後に追加する:

```yaml
      - run: pnpm exec design.md lint DESIGN.md
      - name: 生成済みトークンが DESIGN.md と一致するか確認
        run: |
          pnpm tokens
          git diff --exit-code src/app/theme.css
```

- [ ] **Step 8: テストと検査を通してコミットする**

```bash
pnpm test scripts/lib/themeCss.test.ts && pnpm typecheck && pnpm lint && pnpm build
git add DESIGN.md scripts src/app/theme.css src/app/index.css package.json .github/workflows/ci.yml
git commit -m "Add DESIGN.md as single source of design tokens and generate Tailwind theme"
```

---

### Task 9: manifest の解決とデータ読み込み

**Files:**
- Create: `src/assets/manifest.ts`, `src/app/loadAppData.ts`, `vite/plugins/assetManifestDev.ts`
- Test: `src/assets/manifest.test.ts`, `src/app/loadAppData.test.ts`, `vite/plugins/assetManifestDev.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `LOGICAL_ASSET_PATHS` / `TILES_ASSET` / `CITIES_ASSET`（Task 3）、`parseCities` / `City`（Task 7）
- Produces:
  - `type AssetManifest = Readonly<Record<string, string>>`
  - `parseManifest(value: unknown): AssetManifest`
  - `resolveAssetUrl(manifest: AssetManifest, logicalPath: string, origin: string): string`
  - `fetchManifest(fetchFn: typeof fetch): Promise<AssetManifest>`
  - `type AppData = { tilesUrl: string | null; cities: City[] | null; tilesError: boolean; citiesError: boolean }`
  - `loadAppData(fetchFn: typeof fetch, origin: string): Promise<AppData>`（例外を投げない）
  - `devManifest(): AssetManifest`、`handleManifestRequest(req, res, next)`、`assetManifestDev(): Plugin`

- [ ] **Step 1: 失敗するテストを書く**

`src/assets/manifest.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchManifest, parseManifest, resolveAssetUrl } from "./manifest";

describe("parseManifest", () => {
  it("論理名から / で始まるパスへの対応を受け付ける", () => {
    expect(parseManifest({ "tiles/world.pmtiles": "/tiles/world.abc.pmtiles" })).toEqual({
      "tiles/world.pmtiles": "/tiles/world.abc.pmtiles",
    });
  });

  it("オブジェクトでなければ例外にする", () => {
    expect(() => parseManifest([])).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });

  it("値が文字列でないか / で始まらなければ例外にする", () => {
    expect(() => parseManifest({ a: 1 })).toThrow();
    expect(() => parseManifest({ a: "https://evil.example/x" })).toThrow();
  });
});

describe("resolveAssetUrl", () => {
  const manifest = { "tiles/world.pmtiles": "/tiles/world.abc.pmtiles" };

  it("同じオリジンの絶対 URL にする", () => {
    expect(resolveAssetUrl(manifest, "tiles/world.pmtiles", "https://example.com")).toBe(
      "https://example.com/tiles/world.abc.pmtiles",
    );
  });

  it("論理名が無ければ例外にする", () => {
    expect(() => resolveAssetUrl(manifest, "data/cities.json", "https://example.com")).toThrow(
      "data/cities.json",
    );
  });
});

describe("fetchManifest", () => {
  it("キャッシュを検証して取得する", async () => {
    const fetchFn = vi.fn(async () => Response.json({ a: "/a" }));
    await expect(fetchManifest(fetchFn)).resolves.toEqual({ a: "/a" });
    expect(fetchFn).toHaveBeenCalledWith("/asset-manifest.json", { cache: "no-cache" });
  });

  it("HTTP エラーなら例外にする", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(fetchManifest(fetchFn)).rejects.toThrow("404");
  });
});
```

`src/app/loadAppData.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadAppData } from "./loadAppData";

const ORIGIN = "https://example.com";
const manifest = {
  "tiles/world.pmtiles": "/tiles/world.abc.pmtiles",
  "data/cities.json": "/data/cities.def.json",
};
const cities = [
  {
    id: "bukhara",
    name: "ブハラ",
    reading: "ぶはら",
    type: "city",
    lon: 64.4286,
    lat: 39.7747,
    source: "https://ja.wikipedia.org/wiki/ブハラ",
  },
];

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input).replace(ORIGIN, "");
    const route = routes[url];
    if (!route) {
      throw new TypeError(`ネットワークエラー: ${url}`);
    }
    return route();
  }) as typeof fetch;
}

describe("loadAppData", () => {
  it("manifest と都市データを読めたらタイル URL と都市を返す", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => Response.json(cities),
      }),
      ORIGIN,
    );
    expect(data).toEqual({
      tilesUrl: "https://example.com/tiles/world.abc.pmtiles",
      cities,
      tilesError: false,
      citiesError: false,
    });
  });

  it("manifest が読めなければ、両方をエラーにして例外は投げない", async () => {
    const data = await loadAppData(fakeFetch({}), ORIGIN);
    expect(data).toEqual({ tilesUrl: null, cities: null, tilesError: true, citiesError: true });
  });

  it("都市データが 404 なら都市だけをエラーにする", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => new Response(null, { status: 404 }),
      }),
      ORIGIN,
    );
    expect(data.tilesUrl).toBe("https://example.com/tiles/world.abc.pmtiles");
    expect(data.cities).toBeNull();
    expect(data.citiesError).toBe(true);
    expect(data.tilesError).toBe(false);
  });

  it("都市データの形式が不正なら都市だけをエラーにする", async () => {
    const data = await loadAppData(
      fakeFetch({
        "/asset-manifest.json": () => Response.json(manifest),
        "/data/cities.def.json": () => Response.json([{ id: "x" }]),
      }),
      ORIGIN,
    );
    expect(data.citiesError).toBe(true);
  });
});
```

`vite/plugins/assetManifestDev.test.ts`:

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { devManifest, handleManifestRequest } from "./assetManifestDev";

describe("devManifest", () => {
  it("論理名をそのままローカルパスに対応させる", () => {
    expect(devManifest()).toEqual({
      "tiles/world.pmtiles": "/tiles/world.pmtiles",
      "data/cities.json": "/data/cities.json",
    });
  });
});

describe("handleManifestRequest", () => {
  function fakeResponse() {
    const headers: Record<string, string> = {};
    return {
      headers,
      body: "",
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      end(chunk: string) {
        this.body = chunk;
      },
    };
  }

  it("/asset-manifest.json に開発用の manifest を返す", () => {
    const res = fakeResponse();
    const next = vi.fn();
    handleManifestRequest(
      { url: "/asset-manifest.json?t=1" } as IncomingMessage,
      res as unknown as ServerResponse,
      next,
    );
    expect(next).not.toHaveBeenCalled();
    expect(JSON.parse(res.body)).toEqual(devManifest());
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.headers["Cache-Control"]).toBe("no-cache");
  });

  it("それ以外のパスは次のミドルウェアに渡す", () => {
    const next = vi.fn();
    handleManifestRequest(
      { url: "/index.html" } as IncomingMessage,
      fakeResponse() as unknown as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/assets src/app vite`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 実装する**

`src/assets/manifest.ts`:

```ts
// asset-manifest.json（論理名 → ハッシュ付きパス）の取得と解決

export type AssetManifest = Readonly<Record<string, string>>;

export function parseManifest(value: unknown): AssetManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("asset-manifest.json の形式が不正です");
  }
  const entries = Object.entries(value);
  for (const [logicalPath, path] of entries) {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error(`asset-manifest.json の ${logicalPath} が不正です`);
    }
  }
  return Object.fromEntries(entries) as AssetManifest;
}

export function resolveAssetUrl(manifest: AssetManifest, logicalPath: string, origin: string): string {
  const path = manifest[logicalPath];
  if (path === undefined) {
    throw new Error(`asset-manifest.json に ${logicalPath} がありません`);
  }
  return new URL(path, origin).href;
}

export async function fetchManifest(fetchFn: typeof fetch): Promise<AssetManifest> {
  const response = await fetchFn("/asset-manifest.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`asset-manifest.json の取得に失敗しました（${response.status}）`);
  }
  return parseManifest(await response.json());
}
```

`src/app/loadAppData.ts`:

```ts
// 起動時に manifest と都市データを読み込む。失敗しても例外は投げず、エラーの種類を返す
import { CITIES_ASSET, TILES_ASSET } from "../assets/logicalAssets";
import { type AssetManifest, fetchManifest, resolveAssetUrl } from "../assets/manifest";
import { type City, parseCities } from "../data/city";

export type AppData = {
  tilesUrl: string | null;
  cities: City[] | null;
  tilesError: boolean;
  citiesError: boolean;
};

async function loadCities(fetchFn: typeof fetch, manifest: AssetManifest, origin: string): Promise<City[]> {
  const response = await fetchFn(resolveAssetUrl(manifest, CITIES_ASSET, origin));
  if (!response.ok) {
    throw new Error(`都市データの取得に失敗しました（${response.status}）`);
  }
  return parseCities(await response.json());
}

export async function loadAppData(fetchFn: typeof fetch, origin: string): Promise<AppData> {
  let manifest: AssetManifest;
  try {
    manifest = await fetchManifest(fetchFn);
  } catch (error) {
    console.error(error);
    return { tilesUrl: null, cities: null, tilesError: true, citiesError: true };
  }

  let tilesUrl: string | null = null;
  try {
    tilesUrl = resolveAssetUrl(manifest, TILES_ASSET, origin);
  } catch (error) {
    console.error(error);
  }

  let cities: City[] | null = null;
  try {
    cities = await loadCities(fetchFn, manifest, origin);
  } catch (error) {
    console.error(error);
  }

  return { tilesUrl, cities, tilesError: tilesUrl === null, citiesError: cities === null };
}
```

`vite/plugins/assetManifestDev.ts`:

```ts
// 開発サーバーと vite preview で、ローカルパスを指す asset-manifest.json を返す
// public/ の原本を Vite がそのまま配信するので、R2 なしで動く
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { LOGICAL_ASSET_PATHS } from "../../src/assets/logicalAssets";
import type { AssetManifest } from "../../src/assets/manifest";

export function devManifest(): AssetManifest {
  return Object.fromEntries(LOGICAL_ASSET_PATHS.map((path) => [path, `/${path}`]));
}

export function handleManifestRequest(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  if (req.url?.split("?")[0] !== "/asset-manifest.json") {
    next();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.end(JSON.stringify(devManifest()));
}

export function assetManifestDev(): Plugin {
  return {
    name: "asset-manifest-dev",
    configureServer(server) {
      server.middlewares.use(handleManifestRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleManifestRequest);
    },
  };
}
```

`vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { assetManifestDev } from "./vite/plugins/assetManifestDev";

export default defineConfig({
  plugins: [react(), tailwindcss(), assetManifestDev()],
});
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 5: 開発サーバーで確認する**

```bash
pnpm dev --port 5173 &
sleep 3
curl -s localhost:5173/asset-manifest.json
curl -s -o /dev/null -w '%{http_code} %header{content-range}\n' -r 0-99 localhost:5173/tiles/world.pmtiles
kill %1
```

Expected: manifest がローカルパスを返す。タイルは `206 bytes 0-99/<サイズ>`（Vite の静的配信が Range に対応している）。206 にならなければ BLOCKED として報告する。

- [ ] **Step 6: コミットする**

```bash
git add src/assets src/app/loadAppData.ts src/app/loadAppData.test.ts vite vite.config.ts
git commit -m "Resolve hashed assets via manifest and serve a local manifest in dev"
```

---

### Task 10: 検索ロジック

**Files:**
- Create: `src/search/normalize.ts`, `src/search/match.ts`, `src/search/combobox.ts`
- Test: `src/search/match.test.ts`, `src/search/combobox.test.ts`

**Interfaces:**
- Consumes: `City`（Task 7）
- Produces:
  - `normalizeForSearch(text: string): string`
  - `MAX_SUGGESTIONS = 10`、`searchCities(cities: readonly City[], query: string, limit?: number): City[]`
  - `type ComboboxState = { open: boolean; activeIndex: number }`
  - `handleComboboxKey(state: ComboboxState, key: string, isComposing: boolean, resultCount: number): { state: ComboboxState; chooseIndex: number | null; preventDefault: boolean }`

- [ ] **Step 1: 失敗するテストを書く**

`src/search/match.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { MAX_SUGGESTIONS, normalizeForSearch, searchCities } from "./match";

function city(id: string, name: string, reading: string): City {
  return { id, name, reading, type: "city", lon: 0, lat: 0, source: "https://example.com" };
}

const cities = [
  city("samarkand", "サマルカンド", "さまるかんど"),
  city("bukhara", "ブハラ", "ぶはら"),
  city("kucha", "クチャ（亀茲）", "くちゃ きじ"),
  city("lhasa", "ラサ", "らさ"),
];

describe("normalizeForSearch", () => {
  it("ひらがなをカタカナにし、半角カナを全角にし、空白を除く", () => {
    expect(normalizeForSearch("さま")).toBe("サマ");
    expect(normalizeForSearch("ｻﾏ")).toBe("サマ");
    expect(normalizeForSearch(" サ　マ ")).toBe("サマ");
  });
});

describe("searchCities", () => {
  it("ひらがな・カタカナ・半角カナのどれでも同じ都市が見つかる", () => {
    for (const query of ["さま", "サマ", "ｻﾏ", " さま "]) {
      expect(searchCities(cities, query).map((c) => c.id)).toEqual(["samarkand"]);
    }
  });

  it("表示名に含まれる漢字でも見つかる", () => {
    expect(searchCities(cities, "亀").map((c) => c.id)).toEqual(["kucha"]);
  });

  it("2 つ目の読みでも見つかる", () => {
    expect(searchCities(cities, "きじ").map((c) => c.id)).toEqual(["kucha"]);
  });

  it("前方一致を部分一致より前に並べる", () => {
    expect(searchCities(cities, "ら").map((c) => c.id)).toEqual(["lhasa", "bukhara"]);
  });

  it("空・空白だけの入力は候補を返さない", () => {
    expect(searchCities(cities, "")).toEqual([]);
    expect(searchCities(cities, "　 ")).toEqual([]);
  });

  it("一致しなければ空配列を返す", () => {
    expect(searchCities(cities, "ろーま")).toEqual([]);
  });

  it(`候補は最大 ${MAX_SUGGESTIONS} 件`, () => {
    const many = Array.from({ length: 12 }, (_, i) => city(`c${i}`, `サ${i}`, "さ"));
    expect(searchCities(many, "さ")).toHaveLength(MAX_SUGGESTIONS);
  });
});
```

`src/search/combobox.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type ComboboxState, handleComboboxKey } from "./combobox";

const closed: ComboboxState = { open: false, activeIndex: -1 };
const open0: ComboboxState = { open: true, activeIndex: 0 };

describe("handleComboboxKey", () => {
  it("IME の変換中は何もしない", () => {
    for (const key of ["Enter", "ArrowDown", "ArrowUp", "Escape"]) {
      expect(handleComboboxKey(open0, key, true, 3)).toEqual({
        state: open0,
        chooseIndex: null,
        preventDefault: false,
      });
    }
  });

  it("↓ で次の候補へ進み、最後の次は先頭に戻る", () => {
    expect(handleComboboxKey(closed, "ArrowDown", false, 3).state).toEqual({ open: true, activeIndex: 0 });
    expect(handleComboboxKey({ open: true, activeIndex: 2 }, "ArrowDown", false, 3).state.activeIndex).toBe(0);
  });

  it("↑ で前の候補へ戻り、先頭の前は最後に移る", () => {
    expect(handleComboboxKey(open0, "ArrowUp", false, 3).state.activeIndex).toBe(2);
    expect(handleComboboxKey({ open: true, activeIndex: 2 }, "ArrowUp", false, 3).state.activeIndex).toBe(1);
  });

  it("候補が無ければ ↑↓ で選択位置を持たない", () => {
    expect(handleComboboxKey(closed, "ArrowDown", false, 0).state.activeIndex).toBe(-1);
  });

  it("Enter で選択中の候補を決定し、未選択なら先頭を決定する", () => {
    expect(handleComboboxKey({ open: true, activeIndex: 1 }, "Enter", false, 3).chooseIndex).toBe(1);
    expect(handleComboboxKey(closed, "Enter", false, 3).chooseIndex).toBe(0);
    expect(handleComboboxKey(open0, "Enter", false, 3).state).toEqual(closed);
  });

  it("候補が無ければ Enter で何もしない", () => {
    expect(handleComboboxKey(open0, "Enter", false, 0).chooseIndex).toBeNull();
  });

  it("Esc で候補を閉じる", () => {
    expect(handleComboboxKey(open0, "Escape", false, 3)).toEqual({
      state: closed,
      chooseIndex: null,
      preventDefault: true,
    });
  });

  it("その他のキーは何もしない", () => {
    expect(handleComboboxKey(open0, "a", false, 3).state).toBe(open0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/search`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 実装する**

`src/search/normalize.ts`:

```ts
// 検索の比較用に文字列をそろえる: NFKC（半角カナ → 全角）→ 空白除去 → ひらがな → カタカナ → 小文字
const HIRAGANA = /[ぁ-ゖ]/gu;
const KATAKANA_OFFSET = 0x60;

export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .replace(HIRAGANA, (char) => String.fromCharCode(char.charCodeAt(0) + KATAKANA_OFFSET))
    .toLowerCase();
}
```

`src/search/match.ts`:

```ts
import type { City } from "../data/city";
import { normalizeForSearch } from "./normalize";

export { normalizeForSearch };

export const MAX_SUGGESTIONS = 10;

// 表示名と読みのどれかに一致する都市を、前方一致 → 部分一致の順に返す
export function searchCities(cities: readonly City[], query: string, limit = MAX_SUGGESTIONS): City[] {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery === "") {
    return [];
  }
  const prefixMatches: City[] = [];
  const partialMatches: City[] = [];
  for (const city of cities) {
    const keys = [city.name, ...city.reading.split(" ")].map(normalizeForSearch);
    if (keys.some((key) => key.startsWith(normalizedQuery))) {
      prefixMatches.push(city);
    } else if (keys.some((key) => key.includes(normalizedQuery))) {
      partialMatches.push(city);
    }
  }
  return [...prefixMatches, ...partialMatches].slice(0, limit);
}
```

`src/search/combobox.ts`:

```ts
// 検索窓（WAI-ARIA combobox）のキー操作。React から切り離して単体テストする

export type ComboboxState = { open: boolean; activeIndex: number };

export type ComboboxKeyResult = {
  state: ComboboxState;
  chooseIndex: number | null;
  preventDefault: boolean;
};

const CLOSED: ComboboxState = { open: false, activeIndex: -1 };

export function handleComboboxKey(
  state: ComboboxState,
  key: string,
  isComposing: boolean,
  resultCount: number,
): ComboboxKeyResult {
  const unchanged: ComboboxKeyResult = { state, chooseIndex: null, preventDefault: false };
  // IME の変換確定の Enter などで候補を決定しない
  if (isComposing) {
    return unchanged;
  }
  switch (key) {
    case "ArrowDown": {
      const activeIndex =
        resultCount === 0 ? -1 : state.open && state.activeIndex >= 0 ? (state.activeIndex + 1) % resultCount : 0;
      return { state: { open: true, activeIndex }, chooseIndex: null, preventDefault: true };
    }
    case "ArrowUp": {
      const activeIndex =
        resultCount === 0 ? -1 : state.activeIndex <= 0 ? resultCount - 1 : state.activeIndex - 1;
      return { state: { open: true, activeIndex }, chooseIndex: null, preventDefault: true };
    }
    case "Enter": {
      if (resultCount === 0) {
        return unchanged;
      }
      const chooseIndex = state.activeIndex >= 0 && state.activeIndex < resultCount ? state.activeIndex : 0;
      return { state: CLOSED, chooseIndex, preventDefault: true };
    }
    case "Escape":
      return { state: CLOSED, chooseIndex: null, preventDefault: true };
    default:
      return unchanged;
  }
}
```

- [ ] **Step 4: テストが通ることを確認してコミットする**

```bash
pnpm test src/search && pnpm typecheck && pnpm lint
git add src/search
git commit -m "Add kana-insensitive city search and combobox key handling"
```

---

### Task 11: 地図表示

**Files:**
- Create: `src/map/style.ts`, `src/map/citiesGeoJSON.ts`, `src/map/bounds.ts`, `src/map/MapView.tsx`, `src/app/copy.ts`
- Test: `src/map/style.test.ts`, `src/map/citiesGeoJSON.test.ts`, `src/map/bounds.test.ts`
- Modify: `src/app/App.tsx`（一時的に地図だけを表示して実ブラウザで確認する）

**Interfaces:**
- Consumes: `City`（Task 7）、`loadAppData` / `AppData`（Task 9）、CSS 変数 `--color-ocean|land|coastline|city|city-selected`（Task 8）
- Produces:
  - `src/app/copy.ts`: `COPY`（spec §7 の文言）
  - `src/map/style.ts`: `BASEMAP_SOURCE_ID` `CITIES_SOURCE_ID` `CITY_LAYER_ID` `CITY_HIT_LAYER_ID`、`type MapColors`、`readMapColors(style: Pick<CSSStyleDeclaration, "getPropertyValue">): MapColors`、`buildStyle(tilesUrl: string, colors: MapColors): StyleSpecification`
  - `src/map/citiesGeoJSON.ts`: `citiesToGeoJSON(cities: readonly City[]): CitiesFeatureCollection`
  - `src/map/bounds.ts`: `type Bounds = [[number, number], [number, number]]`、`FALLBACK_BOUNDS`、`boundsOf(cities: readonly City[]): Bounds`
  - `src/map/MapView.tsx`: `MapView(props: MapViewProps)`、`type FocusRequest = { lon: number; lat: number; seq: number }`

```ts
type MapViewProps = {
  tilesUrl: string;
  cities: readonly City[];
  initialBounds: Bounds;
  selectedId: string | null;
  focus: FocusRequest | null;
  onSelect: (id: string | null) => void;
  onTilesError: () => void;
  className?: string;
};
```

- [ ] **Step 1: 失敗するテストを書く**

`src/map/style.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildStyle, CITY_HIT_LAYER_ID, type MapColors, readMapColors } from "./style";

const colors: MapColors = {
  ocean: "#dce8f0",
  land: "#f5f3ec",
  coastline: "#8a9aa6",
  city: "#b4462b",
  citySelected: "#1f3a5f",
};

function fakeStyle(values: Record<string, string>) {
  return { getPropertyValue: (name: string) => values[name] ?? "" };
}

describe("readMapColors", () => {
  it("CSS 変数から地図の色を読む（前後の空白は除く）", () => {
    expect(
      readMapColors(
        fakeStyle({
          "--color-ocean": " #dce8f0",
          "--color-land": "#f5f3ec",
          "--color-coastline": "#8a9aa6",
          "--color-city": "#b4462b",
          "--color-city-selected": "#1f3a5f",
        }),
      ),
    ).toEqual(colors);
  });

  it("変数が空なら、どの変数かを示して例外にする", () => {
    expect(() => readMapColors(fakeStyle({ "--color-ocean": "#fff" }))).toThrow("--color-land");
  });
});

describe("buildStyle", () => {
  const style = buildStyle("https://example.com/tiles/world.abc.pmtiles", colors);

  it("ベースマップを pmtiles:// で参照する", () => {
    expect(style.sources.basemap).toEqual({
      type: "vector",
      url: "pmtiles://https://example.com/tiles/world.abc.pmtiles",
    });
  });

  it("文字を描かないので glyphs と symbol レイヤーを持たない", () => {
    expect(style.glyphs).toBeUndefined();
    expect(style.layers.some((layer) => layer.type === "symbol")).toBe(false);
  });

  it("都市のソースは id を feature id として使う", () => {
    expect(style.sources.cities).toMatchObject({ type: "geojson", promoteId: "id" });
  });

  it("海・陸・海岸線・都市・当たり判定の順に重ねる", () => {
    expect(style.layers.map((layer) => layer.id)).toEqual([
      "ocean",
      "land",
      "coastline",
      "cities",
      CITY_HIT_LAYER_ID,
    ]);
  });
});
```

`src/map/citiesGeoJSON.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { citiesToGeoJSON } from "./citiesGeoJSON";

const bukhara: City = {
  id: "bukhara",
  name: "ブハラ",
  reading: "ぶはら",
  type: "city",
  lon: 64.4286,
  lat: 39.7747,
  source: "https://ja.wikipedia.org/wiki/ブハラ",
};

describe("citiesToGeoJSON", () => {
  it("都市を id だけを持つ点にする（名前は地図に渡さない）", () => {
    expect(citiesToGeoJSON([bukhara])).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [64.4286, 39.7747] },
          properties: { id: "bukhara" },
        },
      ],
    });
  });
});
```

`src/map/bounds.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { City } from "../data/city";
import { boundsOf, FALLBACK_BOUNDS } from "./bounds";

function at(lon: number, lat: number): City {
  return { id: `c${lon}`, name: "x", reading: "x", type: "city", lon, lat, source: "https://example.com" };
}

describe("boundsOf", () => {
  it("すべての都市を含む範囲を返す", () => {
    expect(boundsOf([at(46, 38), at(116, 47), at(80, 40)])).toEqual([
      [46, 38],
      [116, 47],
    ]);
  });

  it("都市が無ければ既定の範囲を返す", () => {
    expect(boundsOf([])).toEqual(FALLBACK_BOUNDS);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/map`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: 純粋な部分を実装する**

`src/app/copy.ts`（spec §7 の文言。ここ以外に UI 文言を書かない）:

```ts
// 画面に出す文言。spec §7 の一覧と一致させる（title と noscript は index.html）
export const COPY = {
  searchPlaceholder: "地名を検索",
  searchLabel: "地名を検索",
  noResults: "該当する地名がありません",
  tilesLoadError: "地図の読み込みに失敗しました",
  citiesLoadError: "地名データの読み込みに失敗しました",
  close: "閉じる",
  zoomIn: "拡大",
  zoomOut: "縮小",
} as const;
```

`src/map/style.ts`:

```ts
// MapLibre のスタイル。色は DESIGN.md から生成した CSS 変数から読む
import type { StyleSpecification } from "maplibre-gl";

export const BASEMAP_SOURCE_ID = "basemap";
export const CITIES_SOURCE_ID = "cities";
export const CITY_LAYER_ID = "cities";
// 見た目の点より広い、透明な当たり判定
export const CITY_HIT_LAYER_ID = "cities-hit";

export type MapColors = {
  ocean: string;
  land: string;
  coastline: string;
  city: string;
  citySelected: string;
};

const COLOR_VARIABLES: Record<keyof MapColors, string> = {
  ocean: "--color-ocean",
  land: "--color-land",
  coastline: "--color-coastline",
  city: "--color-city",
  citySelected: "--color-city-selected",
};

export function readMapColors(style: Pick<CSSStyleDeclaration, "getPropertyValue">): MapColors {
  const read = (name: string): string => {
    const value = style.getPropertyValue(name).trim();
    if (value === "") {
      throw new Error(`CSS 変数 ${name} が空です。pnpm tokens を実行したか確認してください`);
    }
    return value;
  };
  return {
    ocean: read(COLOR_VARIABLES.ocean),
    land: read(COLOR_VARIABLES.land),
    coastline: read(COLOR_VARIABLES.coastline),
    city: read(COLOR_VARIABLES.city),
    citySelected: read(COLOR_VARIABLES.citySelected),
  };
}

const IS_SELECTED = ["boolean", ["feature-state", "selected"], false] as const;

export function buildStyle(tilesUrl: string, colors: MapColors): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BASEMAP_SOURCE_ID]: { type: "vector", url: `pmtiles://${tilesUrl}` },
      [CITIES_SOURCE_ID]: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "id",
      },
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": colors.ocean } },
      {
        id: "land",
        type: "fill",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "land",
        paint: { "fill-color": colors.land },
      },
      {
        id: "coastline",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "coastline",
        paint: { "line-color": colors.coastline, "line-width": 0.8 },
      },
      {
        id: CITY_LAYER_ID,
        type: "circle",
        source: CITIES_SOURCE_ID,
        paint: {
          "circle-radius": ["case", IS_SELECTED, 8, 5],
          "circle-color": ["case", IS_SELECTED, colors.citySelected, colors.city],
          "circle-stroke-color": colors.land,
          "circle-stroke-width": 1.5,
        },
      },
      {
        id: CITY_HIT_LAYER_ID,
        type: "circle",
        source: CITIES_SOURCE_ID,
        paint: { "circle-radius": 16, "circle-opacity": 0 },
      },
    ],
  };
}
```

`IS_SELECTED` の `as const` 配列が MapLibre の式の型に合わない場合は、`["boolean", ["feature-state", "selected"], false]` を各所に直接書く（型を `any` にしない）。

`src/map/citiesGeoJSON.ts`:

```ts
import type { City } from "../data/city";

export type CitiesFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string };
  }>;
};

// 地図に渡すのは位置と id だけ。名前は選択パネルが City から表示する
export function citiesToGeoJSON(cities: readonly City[]): CitiesFeatureCollection {
  return {
    type: "FeatureCollection",
    features: cities.map((city) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [city.lon, city.lat] },
      properties: { id: city.id },
    })),
  };
}
```

`src/map/bounds.ts`:

```ts
import type { City } from "../data/city";

export type Bounds = [[number, number], [number, number]];

// 都市データが読めなかったときの初期表示（中央アジア〜東アジア）
export const FALLBACK_BOUNDS: Bounds = [
  [40, 30],
  [120, 50],
];

export function boundsOf(cities: readonly City[]): Bounds {
  if (cities.length === 0) {
    return FALLBACK_BOUNDS;
  }
  const lons = cities.map((city) => city.lon);
  const lats = cities.map((city) => city.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/map && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: MapView を実装する**

`src/map/MapView.tsx`:

```tsx
import "maplibre-gl/dist/maplibre-gl.css";
import {
  addProtocol,
  type GeoJSONSource,
  Map as MapLibreMap,
  NavigationControl,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";
import { COPY } from "../app/copy";
import type { City } from "../data/city";
import type { Bounds } from "./bounds";
import { citiesToGeoJSON } from "./citiesGeoJSON";
import { BASEMAP_SOURCE_ID, buildStyle, CITIES_SOURCE_ID, CITY_HIT_LAYER_ID, readMapColors } from "./style";

export type FocusRequest = { lon: number; lat: number; seq: number };

type MapViewProps = {
  tilesUrl: string;
  cities: readonly City[];
  initialBounds: Bounds;
  selectedId: string | null;
  focus: FocusRequest | null;
  onSelect: (id: string | null) => void;
  onTilesError: () => void;
  className?: string;
};

// 検索で選んだ都市へ移動するときの最小ズーム
const FOCUS_ZOOM = 5;

let pmtilesRegistered = false;
function registerPmtilesProtocol() {
  if (!pmtilesRegistered) {
    addProtocol("pmtiles", new Protocol().tile);
    pmtilesRegistered = true;
  }
}

// スタイルの読み込みが終わってから地図を操作する
function whenStyleLoaded(map: MapLibreMap, action: () => void) {
  if (map.isStyleLoaded()) {
    action();
  } else {
    map.once("load", action);
  }
}

export function MapView({
  tilesUrl,
  cities,
  initialBounds,
  selectedId,
  focus,
  onSelect,
  onTilesError,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSelect, onTilesError });
  callbacksRef.current = { onSelect, onTilesError };
  const initialBoundsRef = useRef(initialBounds);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    registerPmtilesProtocol();
    const map = new MapLibreMap({
      container,
      style: buildStyle(tilesUrl, readMapColors(getComputedStyle(document.documentElement))),
      bounds: initialBoundsRef.current,
      fitBoundsOptions: { padding: 48 },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
      locale: {
        "NavigationControl.ZoomIn": COPY.zoomIn,
        "NavigationControl.ZoomOut": COPY.zoomOut,
      },
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    map.on("error", (event) => {
      if ((event as { sourceId?: string }).sourceId === BASEMAP_SOURCE_ID) {
        callbacksRef.current.onTilesError();
      }
    });
    map.on("click", (event) => {
      const [feature] = map.queryRenderedFeatures(event.point, { layers: [CITY_HIT_LAYER_ID] });
      const id = feature?.properties?.id;
      callbacksRef.current.onSelect(typeof id === "string" ? id : null);
    });
    map.on("mouseenter", CITY_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CITY_HIT_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      selectedRef.current = null;
    };
  }, [tilesUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    whenStyleLoaded(map, () => {
      map.getSource<GeoJSONSource>(CITIES_SOURCE_ID)?.setData(citiesToGeoJSON(cities));
    });
  }, [cities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    whenStyleLoaded(map, () => {
      const previous = selectedRef.current;
      if (previous !== null) {
        map.setFeatureState({ source: CITIES_SOURCE_ID, id: previous }, { selected: false });
      }
      if (selectedId !== null) {
        map.setFeatureState({ source: CITIES_SOURCE_ID, id: selectedId }, { selected: true });
      }
      selectedRef.current = selectedId;
    });
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focus === null) {
      return;
    }
    map.flyTo({ center: [focus.lon, focus.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM) });
  }, [focus]);

  return <div ref={containerRef} className={className} />;
}
```

`map.getSource<GeoJSONSource>` のジェネリクスが maplibre-gl 6.11 の型と合わなければ、`map.getSource(CITIES_SOURCE_ID) as GeoJSONSource | undefined` にする。

- [ ] **Step 6: 地図だけの画面で実ブラウザ確認する**

`src/app/App.tsx` を一時的に次の内容にする（Task 12 で置き換える）:

```tsx
import { useEffect, useState } from "react";
import { boundsOf, FALLBACK_BOUNDS } from "../map/bounds";
import { MapView } from "../map/MapView";
import { type AppData, loadAppData } from "./loadAppData";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadAppData(fetch, location.origin).then(setData);
  }, []);

  if (data?.tilesUrl == null) {
    return <div className="h-dvh w-full bg-ocean" />;
  }
  return (
    <MapView
      className="h-dvh w-full"
      tilesUrl={data.tilesUrl}
      cities={data.cities ?? []}
      initialBounds={data.cities ? boundsOf(data.cities) : FALLBACK_BOUNDS}
      selectedId={selectedId}
      focus={null}
      onSelect={setSelectedId}
      onTilesError={() => console.error("タイルの読み込みに失敗")}
    />
  );
}
```

`run` スキルに従い `pnpm dev` を起動し、Chromium（`/opt/pw-browsers` の Playwright。WebGL2 のため `--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける）で次を確認する。スクリーンショットを撮って目視でも確かめる。

1. 陸地・海岸線・海が DESIGN.md の色で描かれ、ラベルが一切ない
2. 10 都市の点がすべて表示範囲に入っている
3. 点をクリックすると色と大きさが変わる。別の点をクリックすると前の点が元に戻る。何もない所をクリックすると選択が外れる
4. 点の少し外側（10px 程度）をクリックしても選択できる
5. ドラッグ・ホイールでパン・ズームでき、回転しない。ズームボタンの aria-label が「拡大」「縮小」
6. 帰属表示が出ていない。コンソールにエラーが無い
7. `pnpm build && pnpm preview` でも同じように表示される（MapLibre 6 のワーカーのチャンクがビルドに含まれているか）

- [ ] **Step 7: コミットする**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/map src/app/copy.ts src/app/App.tsx
git commit -m "Render PMTiles basemap and selectable city points with MapLibre"
```

---

### Task 12: 検索窓・選択パネル・画面の組み立て

**Files:**
- Create: `src/search/SearchBox.tsx`, `src/app/SelectionPanel.tsx`, `src/app/ErrorBanner.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `searchCities` / `normalizeForSearch` / `handleComboboxKey`（Task 10）、`MapView` / `FocusRequest` / `boundsOf` / `FALLBACK_BOUNDS`（Task 11）、`loadAppData`（Task 9）、`COPY`（Task 11）
- Produces: 完成した画面

- [ ] **Step 1: 検索窓を実装する**

`src/search/SearchBox.tsx`:

```tsx
import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { COPY } from "../app/copy";
import type { City } from "../data/city";
import { type ComboboxState, handleComboboxKey } from "./combobox";
import { normalizeForSearch, searchCities } from "./match";

type SearchBoxProps = {
  cities: readonly City[];
  onSelect: (city: City) => void;
};

const CLOSED: ComboboxState = { open: false, activeIndex: -1 };

export function SearchBox({ cities, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [combobox, setCombobox] = useState<ComboboxState>(CLOSED);
  const results = useMemo(() => searchCities(cities, query), [cities, query]);
  const listId = useId();
  const hasQuery = normalizeForSearch(query) !== "";
  const expanded = combobox.open && hasQuery;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const choose = (city: City) => {
    onSelect(city);
    setQuery(city.name);
    setCombobox(CLOSED);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Safari は変換確定の Enter で isComposing が false になるので keyCode 229 も見る
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
    const result = handleComboboxKey(combobox, event.key, isComposing, results.length);
    if (result.preventDefault) {
      event.preventDefault();
    }
    setCombobox(result.state);
    const chosen = result.chooseIndex === null ? undefined : results[result.chooseIndex];
    if (chosen) {
      choose(chosen);
    }
  };

  return (
    <div className="relative font-body text-body">
      <input
        type="search"
        role="combobox"
        aria-label={COPY.searchLabel}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && combobox.activeIndex >= 0 ? optionId(combobox.activeIndex) : undefined}
        placeholder={COPY.searchPlaceholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCombobox({ open: true, activeIndex: -1 });
        }}
        onFocus={() => setCombobox((state) => ({ ...state, open: true }))}
        onBlur={() => setCombobox(CLOSED)}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-border bg-surface p-md text-on-surface shadow-md outline-none focus:border-primary"
      />
      <ul
        id={listId}
        role="listbox"
        hidden={!expanded || results.length === 0}
        className="absolute inset-x-0 top-full mt-xs overflow-hidden rounded-md border border-border bg-surface shadow-md"
      >
        {results.map((city, index) => (
          <li
            key={city.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === combobox.activeIndex}
            // blur より先に選択を確定させる
            onMouseDown={(event) => {
              event.preventDefault();
              choose(city);
            }}
            className="cursor-pointer px-md py-sm aria-selected:bg-highlight aria-selected:text-primary"
          >
            {city.name}
          </li>
        ))}
      </ul>
      {expanded && results.length === 0 && (
        <p
          role="status"
          className="absolute inset-x-0 top-full mt-xs rounded-md border border-border bg-surface px-md py-sm text-label text-muted shadow-md"
        >
          {COPY.noResults}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 選択パネルとエラー表示を実装する**

`src/app/SelectionPanel.tsx`:

```tsx
import type { City } from "../data/city";
import { COPY } from "./copy";

type SelectionPanelProps = {
  city: City;
  onClose: () => void;
};

// PC は右上、スマートフォンは下部のシート
export function SelectionPanel({ city, onClose }: SelectionPanelProps) {
  return (
    <section
      aria-live="polite"
      className="pointer-events-auto absolute inset-x-0 bottom-0 m-md flex items-start justify-between gap-md rounded-lg border border-border bg-surface p-lg text-on-surface shadow-md md:inset-x-auto md:bottom-auto md:right-0 md:top-0 md:w-72"
    >
      <h2 className="font-body text-title">{city.name}</h2>
      <button
        type="button"
        aria-label={COPY.close}
        onClick={onClose}
        className="rounded-sm p-xs text-muted hover:bg-highlight"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
    </section>
  );
}
```

`src/app/ErrorBanner.tsx`:

```tsx
type ErrorBannerProps = { message: string };

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <p role="alert" className="rounded-sm bg-error-surface p-sm text-label text-on-error-surface shadow-md">
      {message}
    </p>
  );
}
```

- [ ] **Step 3: 画面を組み立てる**

`src/app/App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import type { City } from "../data/city";
import { boundsOf, FALLBACK_BOUNDS } from "../map/bounds";
import { type FocusRequest, MapView } from "../map/MapView";
import { SearchBox } from "../search/SearchBox";
import { COPY } from "./copy";
import { ErrorBanner } from "./ErrorBanner";
import { type AppData, loadAppData } from "./loadAppData";
import { SelectionPanel } from "./SelectionPanel";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  useEffect(() => {
    loadAppData(fetch, location.origin).then(setData);
  }, []);

  const cities = data?.cities ?? [];
  const selectedCity = useMemo(() => cities.find((city) => city.id === selectedId) ?? null, [cities, selectedId]);
  const onTilesError = useCallback(() => setTilesFailed(true), []);
  const onSearchSelect = useCallback((city: City) => {
    setSelectedId(city.id);
    setFocus((previous) => ({ lon: city.lon, lat: city.lat, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ocean font-body text-body text-on-surface">
      {data?.tilesUrl != null && (
        <MapView
          className="absolute inset-0"
          tilesUrl={data.tilesUrl}
          cities={cities}
          initialBounds={data.cities ? boundsOf(data.cities) : FALLBACK_BOUNDS}
          selectedId={selectedId}
          focus={focus}
          onSelect={setSelectedId}
          onTilesError={onTilesError}
        />
      )}
      {/* max-w-sm は余白トークンの sm と衝突しうるので、DESIGN.md の Layout にある 24rem を直接指定する */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-sm p-md md:max-w-[24rem]">
        <div className="pointer-events-auto">
          <SearchBox cities={cities} onSelect={onSearchSelect} />
        </div>
        {(data?.tilesError || tilesFailed) && <ErrorBanner message={COPY.tilesLoadError} />}
        {data?.citiesError && <ErrorBanner message={COPY.citiesLoadError} />}
      </div>
      {selectedCity && <SelectionPanel city={selectedCity} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
```

- [ ] **Step 4: 実ブラウザで確認する**

`pnpm dev` を起動し、Chromium（swiftshader を有効にする）の PC 幅（1280×800）とスマートフォン幅（375×667、`hasTouch: true`）で確認する。各項目でスクリーンショットを撮る。

1. 「さま」と入力すると候補に「サマルカンド」が出る。↓ → Enter で地図が移動し、点が選択状態になり、パネルに「サマルカンド」と出る
2. 「ｻﾏ」「サマ」「亀」「きじ」でも候補が出る。「ろーま」で「該当する地名がありません」が出る。空白だけでは何も出ない
3. 日本語 IME の確定を模した入力（`keydown` の `isComposing: true` と Enter）で候補が決定されない
4. 候補をマウスクリック・タップで選べる（候補がタップ前に閉じない）
5. 地図の点をクリックするとパネルに名前が出て、×（aria-label「閉じる」）で閉じると点の選択も外れる
6. 375px 幅で検索窓とパネルが画面からはみ出さず、横スクロールが出ない。パネルは下部に出る
7. `/asset-manifest.json` をブロックすると（Playwright の `route.abort()`）「地図の読み込みに失敗しました」と「地名データの読み込みに失敗しました」が出て、画面が真っ白にならない
8. 都市データだけをブロックすると、地図は出て「地名データの読み込みに失敗しました」が出る
9. タイルだけをブロックすると「地図の読み込みに失敗しました」が出て、検索と選択は動く
10. 画面上の文言が spec §7 の一覧と、都市名だけであること

- [ ] **Step 5: コミットする**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src
git commit -m "Add search combobox, selection panel and error banners to the map screen"
git push
```

プッシュ後、PR のプレビュー URL でも 1・5・6 を確認する。

---

### Task 13: CLAUDE.md と `.claude/rules`

**Files:**
- Create: `CLAUDE.md`, `.claude/rules/data.md`, `.claude/rules/worker.md`, `.claude/rules/ui.md`

**Interfaces:**
- Consumes: ここまでのすべての成果物
- Produces: 次のセッションが同じ基準で作業するための指示

- [ ] **Step 1: CLAUDE.md を書く**

`CLAUDE.md`（200 行未満。コードを読めば分かることは書かない）:

````markdown
# 世界史地図

受験生・学習者向けに、世界史の地名を地図で確かめる Web アプリ。設計は `docs/superpowers/specs/2026-09-23-world-history-map-design.md`。

## コマンド

- 開発: `pnpm dev`（manifest は Vite プラグインがローカルパスで返すので R2 は不要）
- 検査: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- 整形: `pnpm format`
- トークン生成: `pnpm tokens`（DESIGN.md を変えたら必ず実行し、`src/app/theme.css` もコミットする）
- タイル生成: `nix develop -c pnpm tiles:build`
- 手元からのデプロイ: `pnpm dev:secrets pnpm deploy:cf`（1Password の `op` を使う）

## 言語

- コミットメッセージは英語
- UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語

## 守ること

- UI 文言は spec §7 の一覧にあるものだけを使う（`src/app/copy.ts` と `index.html`）。新しい文言が必要なら、実装する前にユーザーに内容を確認して spec を更新する
- SEO 用のメタ情報・OGP・favicon などを勝手に足さない
- 色・角丸・余白・文字の値は DESIGN.md の front matter だけで管理する。Tailwind のクラスや MapLibre のスタイルに値を直接書かない
- 設計を変えたら、実装と同じ PR で spec も更新する（ADR は作らない）
- 依存は exact 指定で追加する

## ゴッチャ

- npm script に `deploy` という名前を付けない（pnpm の組み込みコマンドに取られて何も起きない）
- Worker Previews は本番の設定を引き継がない。`wrangler.jsonc` のバインディングを変えたら `previews` 側も直す
- dependabot の PR には Secrets が渡らないので、プレビューは実行されない（CI だけが回る）
- Tailwind v4 は未使用のテーマ変数を出力しない。地図の色は CSS 変数から読むので、`theme.css` は `@theme static` で生成している
- `design.md export` はフォントの並びを 1 つの名前として引用符で囲む。`scripts/lib/themeCss.ts` で直している
- R2 のバケット名 `whm-assets` は `wrangler.jsonc` と `scripts/lib/assetKeys.ts` の 2 か所にある（テストで一致を確認）
- MapLibre 6 は WebGL2 が必須。headless Chromium では `--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける

## 検証

- ロジックは Vitest（node 環境）で確認する。E2E テストは作らない
- UI を変えたら、実ブラウザで PC 幅と 375px 幅の両方を確認する
- デプロイ先は `bash scripts/smoke.sh <URL>` で確認できる
````

- [ ] **Step 2: パスごとのルールを書く**

`.claude/rules/data.md`:

```markdown
---
paths:
  - "public/data/**"
  - "src/data/**"
---

# 都市データの作成方針

- 正確性を網羅性より優先する。不確かなものは載せない
- 座標は遺跡や歴史的中心地を指す。現在の同名都市の中心とずれるなら遺跡を優先する（例: カラコルムはハルホリン近郊の遺跡、サライはセリトレンノエ付近）
- 出典（`source`）は https の URL を 1 件以上。Wikipedia の座標表記や学術資料を使い、精度は小数 2〜4 桁でよい
- `reading` はひらがな・長音符で書き、複数の読みは半角空白で区切る
- 名前は主名称 1 つだけ。別名・現在の地名は持たない（同名の問題は起きてから検討する）
- 追加・修正したら `pnpm test src/data` を通し、座標は地図（OpenStreetMap など）で位置を確かめる
```

`.claude/rules/worker.md`:

```markdown
---
paths:
  - "src/worker/**"
  - "wrangler.jsonc"
  - "scripts/publish-assets.ts"
  - "scripts/lib/assetKeys.ts"
  - ".github/workflows/**"
---

# 配信とデプロイ

- `/tiles/*` と `/data/*` は Worker が R2 から Range 対応で返す。静的アセットは Range を返さないので PMTiles を静的アセットにしない
- R2 のキーは内容ハッシュ付きで immutable。同じキーの内容を書き換えない
- 新しいアセットは `src/assets/logicalAssets.ts` に論理名を足す（manifest・dev プラグイン・公開スクリプトがここを見る）
- 設定は `wrangler.jsonc` とワークフローで管理し、Cloudflare のダッシュボードでは変えない
- Secrets を使うジョブには `github.actor != 'dependabot[bot]'` と fork の除外を付ける
```

`.claude/rules/ui.md`:

```markdown
---
paths:
  - "src/**/*.tsx"
  - "src/app/**"
  - "src/map/**"
  - "DESIGN.md"
---

# 画面

- 文言は `src/app/copy.ts` の `COPY` だけを使う。足すときは spec §7 を先に更新してユーザーの承認を得る
- 色・余白・角丸は DESIGN.md のトークン（Tailwind の `bg-surface`・`p-md` など）を使う。値を直接書かない
- 地図にラベル（symbol レイヤー・glyphs）を追加しない。名前は選択パネルに出す
- ロジックは React から切り離した純関数にして Vitest で確かめる。見た目と操作は実ブラウザで確かめる
```

- [ ] **Step 3: コミットする**

```bash
wc -l CLAUDE.md
git add CLAUDE.md .claude/rules
git commit -m "Add CLAUDE.md and path-scoped rules"
```

Expected: `CLAUDE.md` が 200 行未満。

---

### Task 14: ★ 最終確認

**このタスクはコントローラーが行う。**

- [ ] **Step 1: ブランチ全体をレビューする**

`requesting-code-review` スキルで、最上位のモデルのレビュアーにブランチ全体（main との差分）を見てもらう。spec との整合、Review Focus の 5 項目、UI 文言が §7 の一覧だけか、トークンの直書きが無いかを重点的に見てもらう。指摘は修正してから次へ進む。

- [ ] **Step 2: spec と計画を実装に合わせる**

実装中に変わったこと（スパイクの結果、タイルの最大ズーム、座標の修正など）が spec に反映されているか確認し、足りなければ更新してコミットする。

- [ ] **Step 3: ★ PR をレビュー待ちにし、実機で確認してもらう**

PR をドラフトから外し、本文を最新の状態に更新する。ユーザーに依頼する:

> プレビュー URL を PC とスマートフォンの実機で開き、検索・選択・パン・ズームを確認してください。問題なければ PR をマージしてください。

- [ ] **Step 4: マージ後に本番と dependabot を確認する**

1. `本番デプロイ` ワークフローが成功し、スモークテストが通っていること
2. ユーザーに、GitHub の Insights → Dependency graph → Dependabot で npm のマニフェストがエラーなく読まれているか確認してもらう。pnpm 12 のロックファイルを扱えずエラーになっていたら、spec §12 のとおり pnpm 10.34.5 に固定する修正を新しいブランチで作る（`packageManager` を変え、`pnpm install` でロックファイルを作り直す）
3. 結果を spec §12 のスパイク結果に追記する
