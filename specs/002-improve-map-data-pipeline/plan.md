# Implementation Plan: 地図データパイプラインの改善

**Branch**: `002-improve-map-data-pipeline` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-improve-map-data-pipeline/spec.md`

## Summary

既存の Shell スクリプト + MJS による手動多段階パイプラインを、TypeScript による統合 CLI パイプラインに置き換える。SHA-256 ベースの変更検出、GeoJSON バリデーション、チェックポイント再開、差分デプロイを実装し、`pnpm pipeline` で全ステージを一括実行可能にする。

## Technical Context

**Language/Version**: TypeScript 5.9.x (strict mode) + Node.js 22.x LTS
**Primary Dependencies**: @turf/turf v7 (GeoJSON processing), tippecanoe + tile-join (PMTiles conversion, external CLI), wrangler (Cloudflare R2 upload), tsx (TypeScript executor)
**Storage**: Local filesystem (.cache/, public/pmtiles/, dist/pmtiles/) + Cloudflare R2 (production)
**Testing**: Vitest 4.x (environment: node for pipeline tests)
**Target Platform**: Node.js CLI (pnpm scripts)
**Project Type**: Single project (CLI pipeline extending existing web application)
**Performance Goals**: SC-001: 単一年度更新 5 分以内（エンドツーエンド）
**Constraints**: 47 年度、53 PMTiles ファイル、~527MB デプロイメントデータ。tippecanoe/tile-join は外部 CLI 依存。
**Scale/Scope**: 47 年度（-123000 ～ 2010）、フロントエンド manifest.json との後方互換性維持

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. テストファースト | ✅ PASS | 全パイプラインステージに unit テスト必須。TDD で実装。テストフィクスチャに有効/無効 GeoJSON を含む |
| II. シンプルさと型安全性 | ✅ PASS | strict mode、any 禁止。新規依存は tsx のみ（YAGNI）。Node.js 組み込みモジュール（crypto, child_process, fs）を優先 |
| III. コンポーネント駆動 | ⚠️ N/A | CLI パイプラインのため UI コンポーネントなし。各ステージを独立モジュールとして設計（テスト容易性） |
| IV. 歴史的正確性 | ✅ PASS | バリデーションステージで NAME 属性必須チェック。データ出典（historical-basemaps GPL-3.0）を PMTiles メタデータに保持 |
| V. パフォーマンス | ✅ PASS | SHA-256 変更検出で差分処理。チェックポイント再開でリカバリ時間短縮。差分デプロイで帯域幅 80%+ 削減 |

**Gate Result**: ✅ All gates pass. No violations.

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. テストファースト | ✅ PASS | tests/unit/pipeline/ に各ステージのテスト。fixtures/ にテスト用 GeoJSON。統合テストで全パイプラインフロー検証 |
| II. シンプルさと型安全性 | ✅ PASS | 新規依存は tsx のみ。Pipeline State、Validation Report 等の型を厳密に定義。ジェネリクスや抽象クラスは不使用 |
| III. コンポーネント駆動 | ⚠️ N/A | 変更なし |
| IV. 歴史的正確性 | ✅ PASS | ValidationReport 型でデータ品質を記録。attribution メタデータを tile-join オプションで保持 |
| V. パフォーマンス | ✅ PASS | ファイルストリーミングハッシュ（メモリ効率的）。並列年度処理は将来の最適化として明示的に除外（YAGNI） |

## Project Structure

### Documentation (this feature)

```text
specs/002-improve-map-data-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cli.md           # CLI interface contract
│   └── state-files.md   # State file schemas
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── pipeline/
│   ├── cli.ts              # CLI entry point (pnpm pipeline)
│   ├── pipeline.ts         # Pipeline orchestrator (stage sequencing, year filtering)
│   ├── config.ts           # Pipeline configuration (paths, constants)
│   ├── stages/
│   │   ├── types.ts        # Stage interface definition
│   │   ├── fetch.ts        # Stage 1: git clone/pull historical-basemaps
│   │   ├── merge.ts        # Stage 2: Polygon merge (@turf/turf)
│   │   ├── validate.ts     # Stage 3: GeoJSON validation + auto-repair
│   │   ├── convert.ts      # Stage 4: tippecanoe/tile-join conversion
│   │   ├── prepare.ts      # Stage 5: SHA-256 hash + deployment manifest
│   │   ├── upload.ts       # Stage 6: Differential R2 upload
│   │   └── index-gen.ts    # Stage 7: Year index generation
│   ├── state/
│   │   ├── checkpoint.ts   # Checkpoint persistence + resume logic
│   │   ├── lock.ts         # Concurrent execution prevention (PID lock file)
│   │   └── hash.ts         # SHA-256 content hashing (streaming)
│   └── validation/
│       ├── geojson.ts      # GeoJSON validation rules
│       └── report.ts       # Validation report generation
├── components/             # (existing frontend - unchanged)
├── hooks/                  # (existing frontend - unchanged)
├── utils/                  # (existing frontend - unchanged)
└── types/
    ├── index.ts            # (existing frontend types - unchanged)
    └── pipeline.ts         # Pipeline-specific type definitions

tests/
├── unit/
│   ├── pipeline/
│   │   ├── stages/
│   │   │   ├── fetch.test.ts
│   │   │   ├── merge.test.ts
│   │   │   ├── validate.test.ts
│   │   │   ├── convert.test.ts
│   │   │   ├── prepare.test.ts
│   │   │   ├── upload.test.ts
│   │   │   └── index-gen.test.ts
│   │   ├── state/
│   │   │   ├── checkpoint.test.ts
│   │   │   ├── lock.test.ts
│   │   │   └── hash.test.ts
│   │   └── validation/
│   │       ├── geojson.test.ts
│   │       └── report.test.ts
│   ├── components/         # (existing - unchanged)
│   ├── hooks/              # (existing - unchanged)
│   └── utils/              # (existing - unchanged)
├── integration/
│   └── pipeline/
│       └── pipeline.test.ts
└── fixtures/
    └── pipeline/
        ├── valid.geojson
        ├── valid-multi.geojson
        ├── invalid-missing-name.geojson
        ├── invalid-empty-collection.geojson
        └── invalid-geometry.geojson
```

**Structure Decision**: 既存の `src/` ディレクトリ内に `pipeline/` サブディレクトリを配置。フロントエンドコードとの関心分離のため、専用の `tsconfig.pipeline.json` で型チェックし、`tsconfig.app.json` からは除外する。既存の `scripts/` ディレクトリのファイルは移行完了後に削除。

### Configuration Changes

```text
tsconfig.pipeline.json   # NEW: Pipeline-specific TypeScript config
tsconfig.json            # MODIFIED: Add pipeline reference
tsconfig.app.json        # MODIFIED: Exclude src/pipeline/
vitest.config.ts         # MODIFIED: Pipeline tests use 'node' environment
package.json             # MODIFIED: Add tsx, pipeline scripts
```

## Complexity Tracking

> No violations found. No tracking needed.
