# Data Model: 地図データパイプラインの改善

**Date**: 2026-02-13
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Entity Overview

```
SourceGeoJSON ─── 1:1 ──→ MergedGeoJSON ─── 1:1 ──→ MapTile (PMTiles)
     │                         │                          │
     └──── hash (SHA-256) ─────┘──── hash (SHA-256) ──────┘
                                                           │
                                              ┌────────────┘
                                              ▼
                              DeploymentManifest ◄── hash mapping
                                              │
                                              ▼
                                         YearIndex
```

## Entities

### 1. SourceGeoJSON

特定の年の歴史的領土境界を表す生の GeoJSON ファイル。

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| year | `number` | 年（BCE は負数: -1000 = BC 1000） | 整数 |
| filePath | `string` | `.cache/historical-basemaps/geojson/world_{year}.geojson` | ファイル存在 |
| contentHash | `string` | SHA-256 ハッシュ（全内容） | 64 hex chars |
| features | `GeoJSON.Feature[]` | FeatureCollection のフィーチャー | 非空 |

**Feature Properties** (upstream historical-basemaps):

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| NAME | `string` | Yes | 領土名（例: "France", "Ottoman Empire"） |
| SUBJECTO | `string` | No | 従属先の国名 |
| PARTOF | `string` | No | 上位組織名 |
| BORDERPRECISION | `number` | No | 境界精度 |

**State Transitions**: `fetched` → `merged` → `validated` → `converted` → `prepared` → `uploaded`

---

### 2. MergedGeoJSON

同名領土の ポリゴンが MultiPolygon に統合された処理済み GeoJSON。

| Field | Type | Description |
|-------|------|-------------|
| year | `number` | 年 |
| polygonsPath | `string` | `.cache/geojson/world_{year}_merged.geojson` |
| labelsPath | `string` | `.cache/geojson/world_{year}_merged_labels.geojson` |
| contentHash | `string` | SHA-256（polygons ファイルの内容） |
| featureCount | `number` | マージ後のフィーチャー数（= 領土数） |
| labelCount | `number` | ラベルポイント数（= 領土数） |

**Relationships**:
- 1 SourceGeoJSON → 1 MergedGeoJSON (polygons + labels)
- N 同名 Feature → 1 MultiPolygon Feature

---

### 3. ValidationResult

年ごとのバリデーション結果。

| Field | Type | Description |
|-------|------|-------------|
| year | `number` | 年 |
| passed | `boolean` | バリデーション合格かどうか |
| featureCount | `number` | 検証したフィーチャー数 |
| errors | `ValidationError[]` | 致命的エラー（パイプライン停止） |
| warnings | `ValidationWarning[]` | 警告（続行可能） |
| repairs | `RepairAction[]` | 実行した自動修復 |

```typescript
interface ValidationError {
  type: "missing_name" | "empty_collection" | "invalid_geometry_type" | "unrepairable_geometry";
  featureIndex: number;
  details: string;
}

interface ValidationWarning {
  type: "missing_subjecto" | "low_border_precision" | "repaired_geometry";
  featureIndex: number;
  details: string;
}

interface RepairAction {
  type: "clean_coords" | "rewind" | "buffer_zero" | "unkink";
  featureIndex: number;
  featureName: string;
}
```

---

### 4. MapTile (PMTiles)

PMTiles 形式のバイナリタイルファイル。

| Field | Type | Description |
|-------|------|-------------|
| year | `number` | 年 |
| filePath | `string` | `public/pmtiles/world_{year}.pmtiles` |
| contentHash | `string` | SHA-256 ハッシュ |
| layers | `["territories", "labels"]` | ベクタータイルレイヤー |

**Layers**:

| Layer | Geometry Type | Description | Zoom Range |
|-------|--------------|-------------|------------|
| territories | Polygon / MultiPolygon | 領土の塗りつぶし・境界線 | z0-z10 |
| labels | Point | 領土名ラベル表示位置 | z0-z10 |

---

### 5. HashedTile

コンテンツハッシュ付きの PMTiles ファイル（デプロイ用）。

| Field | Type | Description |
|-------|------|-------------|
| year | `number` | 年 |
| filePath | `string` | `dist/pmtiles/world_{year}.{hash8}.pmtiles` |
| originalPath | `string` | `public/pmtiles/world_{year}.pmtiles` |
| hash8 | `string` | SHA-256 先頭8文字 |

---

### 6. DeploymentManifest

年度からコンテンツハッシュ付きファイル名へのマッピング。

| Field | Type | Description |
|-------|------|-------------|
| version | `string` | ISO 8601 タイムスタンプ |
| files | `Record<string, string>` | `{ "1650": "world_1650.a1b2c3d4.pmtiles" }` |

```typescript
interface DeploymentManifest {
  version: string; // ISO 8601
  files: Record<string, string>; // year -> hashed filename (frontend backward compat)
  metadata?: Record<string, ManifestMetadata>; // year -> detailed info (pipeline internal)
}

interface ManifestMetadata {
  hash: string;   // Full SHA-256 hash (64 hex chars)
  size: number;   // File size in bytes
}
```

**Backward Compatibility**: `files` フィールドは既存フロントエンド (`tiles-config.ts`) との互換性を維持。`metadata` はパイプライン内部の差分検出に使用。

---

### 7. YearIndex

利用可能な年代と領土リストのインデックス。

| Field | Type | Description |
|-------|------|-------------|
| years | `YearEntry[]` | ソート済み年エントリ配列 |

```typescript
interface YearEntry {
  year: number;
  filename: string; // "world_1650.pmtiles"
  countries: string[]; // ソート済み領土名リスト
}

interface YearIndex {
  years: YearEntry[];
}
```

**Relationships**:
- 既存の `src/types/index.ts` で定義済み（変更なし）

---

### 8. PipelineState

パイプラインの実行状態（チェックポイント + ハッシュストア統合）。

```typescript
interface PipelineState {
  version: 1;
  runId: string;
  startedAt: string; // ISO 8601
  completedAt: string | null;
  status: "running" | "completed" | "failed";
  stages: {
    fetch?: {
      completedAt: string;
      sourceCommitHash: string;
    };
  };
  years: Record<string, YearState>;
  indexGen?: {
    completedAt: string | null;
    hash: string | null;
  };
}

interface YearState {
  source?: { hash: string; fetchedAt: string };
  merge?: { hash: string; completedAt: string; featureCount: number; labelCount: number };
  validate?: { completedAt: string; warnings: number; errors: number };
  convert?: { hash: string; completedAt: string };
  prepare?: { hash: string; hashedFilename: string; completedAt: string };
  upload?: { completedAt: string; skipped: boolean };
}
```

---

### 9. ValidationReport

パイプライン実行ごとのバリデーションサマリー。

```typescript
interface ValidationReport {
  runId: string;
  timestamp: string;
  totalYears: number;
  totalFeatures: number;
  totalErrors: number;
  totalWarnings: number;
  totalRepairs: number;
  yearSummaries: YearValidationSummary[];
}

interface YearValidationSummary {
  year: number;
  featureCount: number;
  territoryCount: number;
  errors: number;
  warnings: number;
  repairs: number;
}
```

## Pipeline Stage Interface

各ステージは共通のインターフェースに従う:

```typescript
interface PipelineStage<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
}

interface PipelineContext {
  state: PipelineState;
  years: number[];
  logger: PipelineLogger;
  dryRun: boolean;
}

interface PipelineLogger {
  info(stage: string, message: string): void;
  warn(stage: string, message: string): void;
  error(stage: string, message: string): void;
  timing(stage: string, durationMs: number): void;
}
```

## File Naming Conventions

| Entity | Path Pattern | Example |
|--------|-------------|---------|
| Source GeoJSON | `.cache/historical-basemaps/geojson/world_{year}.geojson` | `.cache/historical-basemaps/geojson/world_1650.geojson` |
| Merged polygons | `.cache/geojson/world_{year}_merged.geojson` | `.cache/geojson/world_1650_merged.geojson` |
| Merged labels | `.cache/geojson/world_{year}_merged_labels.geojson` | `.cache/geojson/world_1650_merged_labels.geojson` |
| PMTiles (local) | `public/pmtiles/world_{year}.pmtiles` | `public/pmtiles/world_1650.pmtiles` |
| PMTiles (deploy) | `dist/pmtiles/world_{year}.{hash8}.pmtiles` | `dist/pmtiles/world_1650.a1b2c3d4.pmtiles` |
| Year index | `public/pmtiles/index.json` | - |
| Manifest | `dist/pmtiles/manifest.json` | - |
| Pipeline state | `.cache/pipeline-state.json` | - |
| Pipeline lock | `.cache/pipeline.lock/info.json` | - |

## Year Encoding

| 表記 | year 値 | ファイル名 (upstream) | ファイル名 (local) |
|------|---------|----------------------|-------------------|
| BC 1000 | -1000 | `world_bc1000.geojson` | `world_-1000.geojson` → `world_-1000.pmtiles` |
| AD 1650 | 1650 | `world_1650.geojson` | `world_1650.geojson` → `world_1650.pmtiles` |
| BC 1 | -1 | `world_bc1.geojson` | `world_-1.geojson` → `world_-1.pmtiles` |
