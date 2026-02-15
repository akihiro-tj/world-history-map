# Research: 地図データパイプラインの改善

**Branch**: `002-improve-map-data-pipeline` | **Date**: 2026-02-13
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## 1. tippecanoe 呼び出し方式

### Decision

`node:child_process` の `execFile` を promisify して tippecanoe / tile-join を外部 CLI として呼び出す。シェルを経由しないため安全。

### Rationale

- tippecanoe の Node.js バインディングは存在しない。`node-tippecanoe`（stevage 作）はシンラッパーで内部的に `execSync` を使用
- tippecanoe は出力を**ファイル**に書き込み、stdout/stderr にはプログレス情報のみ出力する。そのため大量の stdout バッファリングの懸念はなく、`execFile` で十分
- `execFile` はシェルを経由しないため、コマンドインジェクションのリスクがない

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| `execFile` (promisified) | 採用 | シェル不要、安全、十分な機能 |
| `spawn` | 過剰 | ストリーミング不要（ファイル出力） |
| `node-tippecanoe` | 不採用 | 内部で `execSync` 使用、メリットなし |

### Preserved tippecanoe Flags

現在の `convert-to-pmtiles.sh` で使用されているフラグ（維持必須）:

**territories layer (polygons)**:
- `-l territories` (レイヤー名)
- `-z 10 -Z 0` (ズームレベル 0-10)
- `--simplification=10`
- `--force` (上書き許可)

**labels layer (points)**:
- `-l labels`
- `-z 10 -Z 0`
- `-r1 --no-feature-limit --no-tile-size-limit`
- `--force`

**tile-join**: `--force` (上書き許可)

---

## 2. ファイルロック方式

### Decision

`mkdir` アトミック操作 + PID ファイル + mtime ベースの stale 検出による自前実装。

### Rationale

1. `proper-lockfile` は最終更新が5年前 (v4.1.2)。CJS のみで ESM サポートなし。このプロジェクトは ESM (`"type": "module"`) のため互換性の懸念あり
2. 実装が極めてシンプル（50-80行）で、外部依存不要
3. `mkdir` は macOS / Linux の両方でアトミック操作が保証される

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| 自前実装 (mkdir + PID) | 採用 | 依存ゼロ、ESM 互換、シンプル |
| `proper-lockfile` | 不採用 | 5年未更新、CJS のみ |
| `lockfile` (npm) | 不採用 | deprecated 傾向 |
| `fs-ext` (flock) | 不採用 | ネイティブアドオン要、過剰 |

### Implementation Design

- **ロックディレクトリ**: `.cache/pipeline.lock/`
- **ロック情報ファイル**: `.cache/pipeline.lock/info.json`（PID、開始時刻、ホスト名）
- **Stale 検出**:
  1. `process.kill(pid, 0)` で PID 生存確認
  2. ロック情報ファイルの mtime が閾値（5分）を超えていたら stale
- **クリーンアップ**: `process.on("exit")`, `SIGINT`, `SIGTERM` で自動削除
- **手動回復**: `rm -rf .cache/pipeline.lock`

---

## 3. チェックポイント永続化形式

### Decision

単一の JSON ファイル (`.cache/pipeline-state.json`) に、チェックポイント進捗とコンテンツハッシュを統合して保存。書き込みは temp-file + rename のアトミックパターンを使用。

### Rationale

1. **可読性**: JSON は直接確認可能。SQLite はクライアントが必要
2. **依存ゼロ**: `node:fs` の `writeFileSync` + `renameSync` のみ
3. **適切なスケール**: 61年 x 7ステージ = 約20KB の JSON。SQLite は過剰
4. **プロジェクトとの一貫性**: 既存の `manifest.json`, `index.json` と同じ JSON 形式
5. **`node:sqlite` は不採用**: Node.js 22 で実験的 (`--experimental-sqlite` 必要)、本番非推奨

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| 単一 JSON ファイル | 採用 | 可読、依存ゼロ、適切なスケール |
| SQLite (`node:sqlite`) | 不採用 | 実験的 API、クエリ機能不要 |
| 複数 JSON ファイル | 不採用 | ファイル間の不整合リスク |
| NDJSON (追記型ログ) | 不採用 | 状態再生のロジック要、過剰 |

### Checkpoint Granularity

**Per-year-per-stage** 粒度を採用。61年の処理中に year 1800 の stage 4 で失敗した場合、次回実行時に year 1800 の stage 4 から再開可能。

### State File Schema

```json
{
  "version": 1,
  "runId": "2026-02-13T10:30:00.000Z-x7k2",
  "startedAt": "2026-02-13T10:30:00.000Z",
  "completedAt": null,
  "status": "running | completed | failed",
  "stages": {
    "fetch": {
      "completedAt": "...",
      "sourceCommitHash": "abc123"
    }
  },
  "years": {
    "1650": {
      "source": { "hash": "sha256:...", "fetchedAt": "..." },
      "merge": { "hash": "sha256:...", "completedAt": "...", "featureCount": 42, "labelCount": 42 },
      "validate": { "completedAt": "...", "warnings": 0, "errors": 0 },
      "convert": { "hash": "sha256:...", "completedAt": "..." },
      "prepare": { "hash": "sha256:...", "hashedFilename": "world_1650.a1b2c3d4.pmtiles", "completedAt": "..." },
      "upload": { "completedAt": "...", "skipped": false }
    }
  },
  "indexGen": { "completedAt": null, "hash": null }
}
```

### Resume Logic

1. `.cache/pipeline-state.json` を読み込み（`--restart` で強制クリーンスタート）
2. fetch ステージ: upstream の git commit hash を比較。変更があれば全年再処理
3. 各年について: ソース GeoJSON の SHA-256 を計算し、前回と比較。変更があれば下流ステージを無効化
4. 各ステージ完了後にアトミック書き込みで状態更新

---

## 4. GeoJSON バリデーション・自動修復ライブラリ

### Decision

既存の `@turf/turf` 依存のみで実装する。追加の外部バリデーションライブラリは不要。

### Rationale

1. `@turf/turf` は既にプロジェクトの依存関係に含まれている
2. `@turf/buffer` は内部的に **JSTS** (Java Topology Suite の JavaScript ポート、`@turf/jsts@2.7.2`) の `BufferOp` を使用しており、`buffer(0)` は業界標準の堅牢なジオメトリ修復手法
3. `@turf/boolean-valid` は OGC Simple Feature Specification に準拠した検証を提供
4. `@turf/kinks` + `@turf/unkink-polygon` (rbush ベースの空間インデックスで自己交差検出) で自己交差の検出・修復が可能
5. `@turf/rewind` で RFC 7946 準拠の巻き方向を保証
6. `@turf/clean-coords` で冗長な座標を除去

### Alternatives Considered

| ライブラリ | 評価 | 理由 |
|-----------|------|------|
| `@turf/turf` (既存) | 採用 | 既に依存、JSTS ベースの堅牢な修復 |
| `@mapbox/geojsonhint` | 不採用 | lint のみ（修復機能なし） |
| `geojson-validation` | 不採用 | スキーマ検証のみ、ジオメトリ修復なし |
| `jsts` (直接使用) | 不採用 | `@turf/buffer` 経由で既に使用、直接使用は過剰 |

### Validation Checklist (ordered)

1. **GeoJSON 構造検証**: `type === "FeatureCollection"`, features 配列の存在
2. **空チェック**: `features.length > 0` (空の FeatureCollection を拒否)
3. **必須属性検証**: 各 feature に `properties.NAME` が存在し、空文字列でないこと
4. **ジオメトリタイプ検証**: `Polygon` または `MultiPolygon` のみ許可
5. **OGC 検証**: `@turf/boolean-valid` で各ジオメトリの有効性を検証
6. **自己交差検出**: `@turf/kinks` で自己交差ポイントを検出

### Auto-Repair Strategy (ordered)

無効なジオメトリが検出された場合、以下の順序で修復を試みる:

1. **座標クリーンアップ**: `@turf/clean-coords` で冗長な座標を除去
2. **巻き方向修正**: `@turf/rewind` で RFC 7946 準拠の巻き方向に修正
3. **buffer(0) 修復**: `@turf/buffer(feature, 0)` で JSTS BufferOp による自己交差解消・ジオメトリ再構成
4. **自己交差分割**: buffer(0) で修復できない場合、`@turf/unkink-polygon` で自己交差するポリゴンを複数の有効なポリゴンに分割
5. **修復不可**: 上記すべてで修復できない場合、フィーチャーを**拒否**し、バリデーションレポートにエラーとして記録

---

## 5. MD5 から SHA-256 への移行

### Decision

Node.js 組み込みの `node:crypto` の `createHash('sha256')` を使用し、ハッシュの先頭8文字（16進数）をファイル名に使用する。全ファイルの一括再アップロードで移行。

### Rationale

1. **SHA-256 は Node.js 組み込み**: 追加依存不要
2. **8文字の衝突確率**: 8 hex chars = 32 bits。100ファイルでの Birthday Paradox 衝突確率は約 1.2e-6（十分に安全）
3. **フロントエンド互換性**: `tiles-config.ts` はマニフェストからファイル名を読み取るだけのため、ハッシュアルゴリズム変更の影響なし
4. **Cloudflare Worker 互換性**: Worker はファイル名で R2 からオブジェクトを取得するため、ハッシュ方式に依存しない

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| SHA-256 (8 chars) | 採用 | 組み込み、安全、既存形式と互換 |
| SHA-256 (12 chars) | 不要 | 100ファイル規模では8文字で十分 |
| MD5 維持 | 不採用 | 仕様要件で SHA-256 を指定 |
| xxHash | 不採用 | 外部依存追加、暗号学的ハッシュの方が安全 |

### Impact Analysis

| 影響範囲 | 変更要否 | 詳細 |
|----------|---------|------|
| `prepare-pmtiles.mjs` を `prepare.ts` へ | 変更 | MD5 を SHA-256 に変更 + TypeScript 移植 |
| `manifest.json` 構造 | 変更なし | キー: year, 値: filename (ハッシュ部分が変わるだけ) |
| `tiles-config.ts` (フロントエンド) | 変更なし | マニフェストからファイル名を読み取るだけ |
| Cloudflare Worker | 変更なし | ファイル名で R2 オブジェクトを取得するのみ |
| R2 バケット内のファイル | 全再アップロード | ファイル名が変わるため全ファイル再アップロード必要 |

### Migration Plan

1. `prepare.ts` に SHA-256 ハッシュ生成を実装（新規 TypeScript ファイル）
2. `pnpm pipeline` を実行して新しいハッシュ付きファイルを生成
3. `upload` ステージで全ファイルを R2 に再アップロード（初回のみ全量）
4. 旧 MD5 ハッシュのファイルは R2 上に残るが、マニフェストが新ファイルを指すため問題なし
5. 古いファイルは任意のタイミングで R2 から手動削除可能

---

## 6. TypeScript CLI 実行方式

### Decision

`tsx` を使用してパイプライン TypeScript コードを直接実行する。

### Rationale

1. tsx は esbuild ベースの TypeScript executor で、コンパイルなしに .ts ファイルを直接実行可能
2. プロジェクトは既に `"type": "module"` (ESM) を使用しており、tsx は ESM をネイティブサポート
3. ts-node と比較して起動が高速（esbuild による JIT トランスパイル）
4. 新規依存は `tsx` パッケージ 1 つのみ（YAGNI 原則に合致）
5. `pnpm pipeline` → `tsx src/pipeline/cli.ts` として実行

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| `tsx` | 採用 | ESM ネイティブ、高速起動、シンプル |
| `ts-node` | 不採用 | ESM に追加フラグ (`--esm`) 必要、起動が遅い |
| `tsc + node` | 不採用 | ビルドステップ必須、出力ファイル管理が複雑 |
| `Bun / Deno` | 不採用 | Node.js 22.x LTS 制約に合致しない |

---

## 7. Git 操作の TypeScript 統合

### Decision

`node:child_process` の `execFile` で `git` コマンドを直接実行する。`simple-git` 等の外部ライブラリは不使用。

### Rationale

1. Git 操作は clone と pull の 2 つのみ（単純なユースケース）
2. `simple-git` は 203KB+ の追加依存。clone/pull だけのために過剰
3. `execFile('git', ['clone', '--depth', '1', url, dest])` で shallow clone が可能
4. shallow clone (`--depth 1`) でネットワーク転送量を最小化
5. `.cache/historical-basemaps/` にクローン。2 回目以降は `git -C .cache/historical-basemaps pull`

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| `execFile('git', ...)` | 採用 | 依存ゼロ、2 操作のみで十分 |
| `simple-git` | 不採用 | 機能過多、203KB+ の追加依存 |
| `isomorphic-git` | 不採用 | ブラウザ対応は不要 |
| HTTP download (curl) | 不採用 | 現在の方式。全年度で 47 回の HTTP リクエスト必要 |

### Offline Mode Design

```text
1. .cache/historical-basemaps/ が存在しない場合:
   → git clone を実行（ネットワーク必須）
   → 失敗時: エラー報告して停止

2. .cache/historical-basemaps/ が存在する場合:
   → git pull を試行
   → 失敗時（ネットワーク不可）: 警告を出してローカルキャッシュで続行（オフラインモード）
```

### Year Auto-Detection

git clone 後、`.cache/historical-basemaps/geojson/` をスキャンして利用可能な年度を自動検出:
- `world_1650.geojson` → year: 1650
- `world_bc1000.geojson` → year: -1000
- `AVAILABLE_YEARS` のハードコードが不要になる

---

## 8. manifest.json の後方互換性

### Decision

既存の `files: Record<string, string>` 構造を維持し、追加の `metadata` フィールドで拡張情報を提供する。

### Rationale

1. フロントエンド (`tiles-config.ts`) は `manifest.files[year]` でハッシュ付きファイル名を取得
2. この既存インターフェース (`TilesManifest.files`) を壊さない
3. パイプライン内部での差分検出には `metadata` フィールドの `hash`（フル SHA-256）と `size` を使用

### New Manifest Structure

```json
{
  "version": "2026-02-13T10:00:00.000Z",
  "files": {
    "1650": "world_1650.a1b2c3d4.pmtiles"
  },
  "metadata": {
    "1650": {
      "hash": "a1b2c3d4e5f67890...(full 64 hex chars)",
      "size": 10485760
    }
  }
}
```

### Frontend Impact

- `tiles-config.ts` の `TilesManifest` 型は `files: Record<string, string>` のみを使用
- `metadata` フィールドは無視される（TypeScript の構造的型付けにより互換）
- `manifest.files[year]` の返り値は変わらず文字列（ハッシュ付きファイル名）

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| `metadata` フィールド追加 | 採用 | 後方互換、フロントエンド変更不要 |
| `files` の値を object に変更 | 不採用 | フロントエンドの破壊的変更 |
| 別ファイル分離 | 不採用 | 2 ファイルの同期管理が複雑 |

---

## 9. Vitest パイプラインテスト環境

### Decision

`environmentMatchGlobs` で `tests/**/pipeline/**` に `node` 環境を適用する。

### Rationale

1. フロントエンドテストは `jsdom` 環境（DOM API が必要）
2. パイプラインテストは `node` 環境（ファイルシステム操作、child_process が必要）
3. `vitest.config.ts` の `environmentMatchGlobs` で glob パターンベースの環境指定が可能
4. テストファイルごとに `// @vitest-environment node` コメントを書く必要がない

### Configuration

```typescript
// vitest.config.ts に追加
test: {
  environment: 'jsdom',  // default for frontend tests
  environmentMatchGlobs: [
    ['tests/**/pipeline/**', 'node'],  // pipeline tests use node env
  ],
}
```

### Alternatives Considered

| 手法 | 評価 | 理由 |
|------|------|------|
| `environmentMatchGlobs` | 採用 | 設定一箇所、自動適用 |
| Per-file `@vitest-environment` | 不採用 | 各テストファイルに追記必要、漏れのリスク |
| 別 vitest config | 不採用 | 設定の重複が発生 |

---

## 10. tsconfig.pipeline.json の設計

### Decision

`tsconfig.node.json` をベースに、`src/pipeline/` と `src/types/pipeline.ts` を対象とする専用 config を作成。`tsconfig.app.json` から `src/pipeline/` を除外。

### Rationale

1. `tsconfig.app.json` は DOM 型 (`"lib": ["ES2022", "DOM", "DOM.Iterable"]`) + JSX を含む
2. パイプラインコードに DOM 型を提供するとブラウザ API の誤用防止ができない（例: `fetch()` の DOM 版と Node.js 版の混同）
3. `tsconfig.node.json` の strict 設定をベースに `types: ["node"]` で Node.js API のみを提供
4. `tsconfig.json` の references に追加して `tsc -b` での一括型チェックに含める

### Configuration

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.pipeline.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/pipeline/**/*.ts", "src/types/pipeline.ts"]
}
```

### Changes to Existing Configs

```diff
// tsconfig.json
{
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
+   { "path": "./tsconfig.pipeline.json" },
    { "path": "./tsconfig.test.json" }
  ]
}

// tsconfig.app.json
{
- "include": ["src"]
+ "include": ["src"],
+ "exclude": ["src/pipeline"]
}
```
