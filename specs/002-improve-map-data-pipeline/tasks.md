# タスク: 地図データパイプラインの改善

**入力**: `/specs/002-improve-map-data-pipeline/` の設計ドキュメント
**前提**: plan.md（必須）, spec.md（必須）, research.md, data-model.md, contracts/

**テスト**: Constitution Check により TDD アプローチが必須。全パイプラインステージにユニットテストを含む。

**構成**: ユーザーストーリーごとにタスクをグループ化し、各ストーリーの独立した実装・テストを可能にする。

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存なし）
- **[Story]**: 所属するユーザーストーリー（例: US1, US2, US3, US4）
- 説明には正確なファイルパスを含む

## Phase 1: セットアップ（共有インフラ）

**目的**: プロジェクト初期化、TypeScript 設定、テストインフラ構築

- [x] T001 パイプライン専用 TypeScript 設定を tsconfig.pipeline.json に作成（target ES2023, lib ES2023, types node のみ, include src/pipeline/**/\*.ts と src/types/pipeline.ts）
- [x] T002 tsconfig.json にパイプライン参照を追加し、tsconfig.app.json から src/pipeline/ を除外
- [x] T003 [P] tsx devDependency とパイプライン pnpm スクリプト（"pipeline": "tsx src/pipeline/cli.ts"）を package.json に追加
- [x] T004 [P] vitest の environmentMatchGlobs で tests/**/pipeline/** に node 環境を設定（vitest.config.ts）
- [x] T005 [P] テストフィクスチャ GeoJSON ファイル（valid.geojson, valid-multi.geojson, invalid-missing-name.geojson, invalid-empty-collection.geojson, invalid-geometry.geojson）を tests/fixtures/pipeline/ に作成

---

## Phase 2: 基盤（全ストーリーの前提条件）

**目的**: 全ユーザーストーリーが依存するコア型定義、共有ユーティリティ、インフラ

**注意**: このフェーズが完了するまでユーザーストーリーの作業は開始不可

- [x] T006 全パイプライン型定義（PipelineState, YearState, ValidationResult, ValidationError, ValidationWarning, RepairAction, DeploymentManifest, ManifestMetadata, ValidationReport, YearValidationSummary）を src/types/pipeline.ts に定義
- [x] T007 [P] PipelineStage ジェネリックインターフェース、PipelineContext、PipelineLogger 型を src/pipeline/stages/types.ts に定義
- [x] T008 [P] パイプライン設定（.cache/, public/pmtiles/, dist/pmtiles/ のパス、年エンコーディングヘルパー、tippecanoe フラグ定数）を src/pipeline/config.ts に実装
- [x] T009 [P] SHA-256 ストリーミングハッシュのユニットテスト（ハッシュ出力検証、空ファイル、大容量ファイルストリーミング）を tests/unit/pipeline/state/hash.test.ts に作成
- [x] T010 node:crypto の createHash とファイルストリームパイピングによる SHA-256 ストリーミングハッシュユーティリティを src/pipeline/state/hash.ts に実装
- [x] T011 [P] ファイルロック機構のユニットテスト（取得、解放、stale 検出、同時実行拒否）を tests/unit/pipeline/state/lock.test.ts に作成
- [x] T012 mkdir ベースのファイルロック（PID info.json、process.kill(pid,0) 生存確認、5分 mtime stale 検出、SIGINT/SIGTERM クリーンアップ）を src/pipeline/state/lock.ts に実装

**チェックポイント**: 基盤完了 - 型定義、ハッシュ、ロックインフラが全ステージで利用可能

---

## Phase 3: ユーザーストーリー 1 - データ変換の自動化（優先度: P1）MVP

**ゴール**: 単一コマンド（`pnpm pipeline run`）で全ステージ（fetch → merge → convert → prepare）を実行。SHA-256 変更検出とチェックポイント再開を含む

**独立テスト**: `pnpm pipeline run --year 1650` をサンプル GeoJSON で実行し、`dist/pmtiles/` にハッシュ付きファイル名の有効な PMTiles が生成されることを確認

### US1 のテスト

> **注意: これらのテストを先に書き、実装前に FAIL することを確認（TDD）**

- [x] T013 [P] [US1] fetch ステージのユニットテスト（execFile git clone/pull のモック、キャッシュ存在時のオフラインフォールバック、ファイル名からの年度自動検出）を tests/unit/pipeline/stages/fetch.test.ts に作成
- [x] T014 [P] [US1] merge ステージのユニットテスト（同名ポリゴンの MultiPolygon マージ、重心ラベルポイント生成、フィーチャー数検証）を tests/unit/pipeline/stages/merge.test.ts に作成
- [x] T015 [P] [US1] convert ステージのユニットテスト（execFile tippecanoe/tile-join のモック、フラグ引数検証、tippecanoe 未インストール時のエラー）を tests/unit/pipeline/stages/convert.test.ts に作成
- [x] T016 [P] [US1] prepare ステージのユニットテスト（PMTiles の SHA-256 ハッシュ、8文字 hex ファイル名、dist/ へのコピー）を tests/unit/pipeline/stages/prepare.test.ts に作成
- [x] T017 [P] [US1] チェックポイント永続化のユニットテスト（状態の保存/読み込み、最後の成功ステージからの再開、--restart フラグによる状態クリア）を tests/unit/pipeline/state/checkpoint.test.ts に作成

### US1 の実装

- [x] T018 [P] [US1] fetch ステージ実装: 初回は git clone --depth 1、更新時は git -C pull、オフラインフォールバック（警告付き）、.cache/historical-basemaps/geojson/ のファイル名（world_{year}.geojson, world_bc{n}.geojson）からの年度自動検出を src/pipeline/stages/fetch.ts に実装
- [x] T019 [P] [US1] チェックポイント永続化実装: .cache/pipeline-state.json へのアトミック JSON 書き込み（temp + rename）、年度×ステージ粒度、ソースハッシュ比較による再開ロジック、--restart サポートを src/pipeline/state/checkpoint.ts に実装
- [x] T020 [US1] merge ステージ実装: NAME プロパティでフィーチャーをグループ化、@turf/union でポリゴンを MultiPolygon に統合、@turf/centroid で重心ラベルポイント生成、マージ済み + ラベル GeoJSON を .cache/geojson/ に出力を src/pipeline/stages/merge.ts に実装
- [x] T021 [US1] convert ステージ実装: tippecanoe（-l territories -z 10 -Z 0 --simplification=10）と labels（-l labels -z 10 -Z 0 -r1 --no-feature-limit --no-tile-size-limit）の promisified execFile、tile-join でレイヤー結合（--attribution でデータ出典 historical-basemaps GPL-3.0 を保持）、public/pmtiles/ に出力を src/pipeline/stages/convert.ts に実装
- [x] T022 [US1] prepare ステージ実装: PMTiles ファイルの SHA-256 計算、8文字 hex ハッシュ付きファイル名（world_{year}.{hash8}.pmtiles）生成、dist/pmtiles/ へコピー、デプロイメントマニフェストの files と metadata フィールド更新を src/pipeline/stages/prepare.ts に実装
- [x] T023 [US1] パイプラインオーケストレータ実装: ステージ順序制御（fetch → merge → convert → prepare）、年度ごとの反復処理、SHA-256 変更検出による未変更年度スキップ、各ステージ後のチェックポイント保存、ロック取得/解放、[HH:MM:SS] [STAGE] 形式のログ出力を src/pipeline/pipeline.ts に実装
- [x] T024 [US1] CLI エントリポイント実装: コマンド解析（run, status, list）とオプション（--year, --years, --restart, --dry-run, --skip-upload, --verbose）、終了コード（0=成功, 1=パイプラインエラー, 2=ロックエラー, 3=設定エラー）、個別ステージコマンドを src/pipeline/cli.ts に実装

**チェックポイント**: `pnpm pipeline run` で fetch、merge、convert、prepare が変更検出とチェックポイント再開付きで実行可能

---

## Phase 4: ユーザーストーリー 2 - データバリデーション（優先度: P2）

**ゴール**: マージ後の自動 GeoJSON バリデーション（自動修復付き）、エラー時のパイプライン停止、バリデーションサマリーレポートの生成

**独立テスト**: 有効な GeoJSON と意図的に不正な GeoJSON をバリデーションに通し、エラーが検出され（NAME 欠落、空コレクション、無効ジオメトリ）、自動修復が試行される（buffer(0), rewind, unkink）ことを確認

### US2 のテスト

> **注意: これらのテストを先に書き、実装前に FAIL することを確認（TDD）**

- [x] T025 [P] [US2] GeoJSON バリデーションルールのユニットテスト（NAME 属性チェック、空 FeatureCollection 拒否、ジオメトリタイプ検証、@turf/boolean-valid による OGC 検証、@turf/kinks による自己交差検出）と自動修復（clean-coords, rewind, buffer(0), unkink-polygon）を tests/unit/pipeline/validation/geojson.test.ts に作成
- [x] T026 [P] [US2] バリデーションレポート生成のユニットテスト（年度ごとのサマリー、合計集計、エラー/警告/修復数）を tests/unit/pipeline/validation/report.test.ts に作成
- [x] T027 [P] [US2] validate ステージのユニットテスト（有効データの通過、エラー時のブロック、警告時の続行、修復アクションの記録）を tests/unit/pipeline/stages/validate.test.ts に作成

### US2 の実装

- [x] T028 [US2] GeoJSON バリデーションルール実装: FeatureCollection 構造チェック、空 features 拒否、NAME プロパティ必須・非空チェック、Polygon/MultiPolygon のみ許可、@turf/boolean-valid OGC チェック、@turf/kinks 自己交差検出; 自動修復パイプライン: @turf/clean-coords → @turf/rewind → @turf/buffer(0) → @turf/unkink-polygon → 修復不可なら拒否を src/pipeline/validation/geojson.ts に実装
- [x] T029 [US2] バリデーションレポート生成実装: 年度ごとの ValidationResult を ValidationReport に集約（totalYears, totalFeatures, totalErrors, totalWarnings, totalRepairs, yearSummaries 配列）を src/pipeline/validation/report.ts に実装
- [x] T030 [US2] validate ステージ実装: 年度ごとにマージ済み GeoJSON にバリデーションルールを適用、エラー時はパイプライン停止（FR-004）、警告と修復を記録、年度ごとに ValidationResult を出力を src/pipeline/stages/validate.ts に実装
- [x] T031 [US2] validate ステージをパイプラインオーケストレータの merge と convert の間に統合、全年度バリデーション後にバリデーションレポート生成を追加を src/pipeline/pipeline.ts に実装

**チェックポイント**: パイプラインがマージ後にデータを検証し、ジオメトリ問題を自動修復し、エラー時に停止し、バリデーションサマリーレポートを生成

---

## Phase 5: ユーザーストーリー 3 - 差分デプロイ（優先度: P3）

**ゴール**: ローカル SHA-256 ハッシュとデプロイメントマニフェストを比較し、変更された PMTiles ファイルのみを Cloudflare R2 にアップロード。帯域幅を 80%以上削減

**独立テスト**: 54 ファイル中 1 ファイルを変更後にアップロードを実行し、そのファイルのみが R2 にアップロードされ、マニフェストが更新されることを確認

### US3 のテスト

> **注意: これらのテストを先に書き、実装前に FAIL することを確認（TDD）**

- [x] T032 [P] [US3] upload ステージのユニットテスト（マニフェストハッシュ比較による差分検出、wrangler R2 アップロードのモック、初回デプロイ時の全量アップロード、未変更ファイルのスキップ、アップロード/スキップのログ表示）を tests/unit/pipeline/stages/upload.test.ts に作成

### US3 の実装

- [x] T033 [US3] 差分アップロードステージ実装: dist/pmtiles/ から既存 manifest.json を読み込み、ローカル SHA-256 ハッシュとマニフェスト metadata を比較、変更ファイルのみ wrangler r2 object put でアップロード、更新済み manifest.json（version タイムスタンプと metadata フィールド付き）を書き込み、アップロード/スキップファイルをログ出力を src/pipeline/stages/upload.ts に実装
- [x] T034 [US3] upload ステージをパイプラインの最終ステージとして統合（index-gen がある場合はその後、なければ prepare の後）、--skip-upload フラグを尊重、以前のマニフェストがない場合は全量アップロードを src/pipeline/pipeline.ts に実装

**チェックポイント**: `pnpm pipeline run` で変更ファイルのみを差分検出して R2 にアップロード

---

## Phase 6: ユーザーストーリー 4 - 年代インデックスの自動生成（優先度: P3）

**ゴール**: パイプライン実行時に年代インデックス（index.json）を自動再生成。利用可能な年代とその領土の一覧が実際のタイルデータと常に一致することを保証

**独立テスト**: 1600年、1650年、1700年のパイプラインを実行し、index.json にその 3 年分のエントリが正しいファイル名と領土リスト付きで含まれることを確認

### US4 のテスト

> **注意: これらのテストを先に書き、実装前に FAIL することを確認（TDD）**

- [x] T035 [P] [US4] インデックス生成ステージのユニットテスト（PMTiles ディレクトリスキャン、マージ済み GeoJSON からの年度と領土抽出、ソート済み出力、年度の追加/削除検出）を tests/unit/pipeline/stages/index-gen.test.ts に作成

### US4 の実装

- [x] T036 [US4] 年代インデックス生成ステージ実装: 処理済み年度をスキャン、マージ済み GeoJSON から領土名を抽出、YearEntry 配列（year, filename, ソート済み countries リスト）を構築、index.json を public/pmtiles/ に書き込みを src/pipeline/stages/index-gen.ts に実装
- [x] T037 [US4] index-gen ステージをパイプラインオーケストレータの prepare と upload の間に統合を src/pipeline/pipeline.ts に実装

**チェックポイント**: `pnpm pipeline run` で実際のタイルデータと一致する index.json を自動生成

---

## Phase 7: 仕上げ・横断的関心事

**目的**: 統合テスト、レガシースクリプトのクリーンアップ、エンドツーエンド検証

- [x] T038 全パイプラインフローの統合テスト（fetch → merge → validate → convert → prepare → index → upload、外部依存はモック）を tests/integration/pipeline/pipeline.test.ts に作成
- [x] T039 [P] 移行検証後にレガシーシェルスクリプト（convert-to-pmtiles.sh, upload-to-r2.sh, generate-index.sh）を確認・クリーンアップ（scripts/ ディレクトリ）
- [x] T040 quickstart.md 検証の実行: クリーン環境でドキュメント記載のコマンドを実行し、エンドツーエンドの開発者ワークフローを確認

---

## 依存関係と実行順序

### フェーズ間の依存

- **セットアップ（Phase 1）**: 依存なし - 即座に開始可能
- **基盤（Phase 2）**: セットアップ完了に依存 - 全ユーザーストーリーをブロック
- **US1（Phase 3）**: 基盤（Phase 2）に依存 - 他のストーリーへの依存なし
- **US2（Phase 4）**: 基盤（Phase 2）に依存 - US1 のパイプラインオーケストレータと統合
- **US3（Phase 5）**: 基盤（Phase 2）に依存 - パイプラインオーケストレータと統合
- **US4（Phase 6）**: 基盤（Phase 2）に依存 - パイプラインオーケストレータと統合
- **仕上げ（Phase 7）**: 全ユーザーストーリーの完了に依存

### ユーザーストーリー間の依存

- **US1（P1）**: Phase 2 完了後に開始可能 - 最初に完了必須（US2-US4 が拡張するパイプラインオーケストレータを提供）
- **US2（P2）**: US1 に依存（pipeline.ts に validate ステージを挿入）
- **US3（P3）**: US1 に依存（pipeline.ts に upload ステージを追加）
- **US4（P3）**: US1 に依存（pipeline.ts に index-gen ステージを追加）。US3 より先に完了すべき（パイプライン実行順で index-gen は upload の前）

### 推奨実行順序

```
Phase 1（セットアップ）→ Phase 2（基盤）→ Phase 3（US1）→ Phase 4（US2）→ Phase 6（US4）→ Phase 5（US3）→ Phase 7（仕上げ）
```

注: US4（index-gen）を US3（upload）より先に実装する理由: パイプライン実行順で index 生成が upload の前に位置し、インデックスファイルがデプロイに含まれることを保証するため。

### 各ユーザーストーリー内の順序

- テストを先に書き、実装前に FAIL することを確認（TDD）
- 型定義 → ユーティリティ → ステージ → オーケストレータ → CLI

### 並列実行の機会

**Phase 1**: T003, T004, T005 を並列実行可能（3 タスク）
**Phase 2**: T007+T008 を並列; T009+T011 を並列（4 タスク）
**Phase 3 テスト**: T013-T017 をすべて並列（5 タスク）
**Phase 3 実装**: T018+T019 を並列（2 タスク）
**Phase 4 テスト**: T025-T027 をすべて並列（3 タスク）
**Phase 5 テスト**: T032（1 タスク）
**Phase 6 テスト**: T035（1 タスク）
**Phase 7**: T039 を T038 と並列（1 タスク）

---

## 並列実行例: ユーザーストーリー 1

```bash
# US1 の全テストを並列起動（TDD - まず失敗するテストを全て書く）:
Task: T013 "fetch ステージのユニットテスト tests/unit/pipeline/stages/fetch.test.ts"
Task: T014 "merge ステージのユニットテスト tests/unit/pipeline/stages/merge.test.ts"
Task: T015 "convert ステージのユニットテスト tests/unit/pipeline/stages/convert.test.ts"
Task: T016 "prepare ステージのユニットテスト tests/unit/pipeline/stages/prepare.test.ts"
Task: T017 "チェックポイント永続化のユニットテスト tests/unit/pipeline/state/checkpoint.test.ts"

# 次に独立した実装を並列起動:
Task: T018 "fetch ステージ src/pipeline/stages/fetch.ts"
Task: T019 "チェックポイント永続化 src/pipeline/state/checkpoint.ts"

# 次に順次実装（types/config に依存）:
Task: T020 "merge ステージ src/pipeline/stages/merge.ts"
Task: T021 "convert ステージ src/pipeline/stages/convert.ts"
Task: T022 "prepare ステージ src/pipeline/stages/prepare.ts"

# 最後にオーケストレータと CLI（全ステージに依存）:
Task: T023 "パイプラインオーケストレータ src/pipeline/pipeline.ts"
Task: T024 "CLI エントリポイント src/pipeline/cli.ts"
```

## 並列実行例: ユーザーストーリー 2

```bash
# US2 の全テストを並列起動:
Task: T025 "GeoJSON バリデーションのユニットテスト tests/unit/pipeline/validation/geojson.test.ts"
Task: T026 "バリデーションレポートのユニットテスト tests/unit/pipeline/validation/report.test.ts"
Task: T027 "validate ステージのユニットテスト tests/unit/pipeline/stages/validate.test.ts"

# 次に順次実装:
Task: T028 "GeoJSON バリデーションルール src/pipeline/validation/geojson.ts"
Task: T029 "バリデーションレポート生成 src/pipeline/validation/report.ts"
Task: T030 "validate ステージ src/pipeline/stages/validate.ts"
Task: T031 "パイプラインオーケストレータへの統合 src/pipeline/pipeline.ts"
```

---

## 実装戦略

### MVP ファースト（ユーザーストーリー 1 のみ）

1. Phase 1: セットアップ完了（T001-T005）
2. Phase 2: 基盤完了（T006-T012）
3. Phase 3: ユーザーストーリー 1 完了（T013-T024）
4. **停止して検証**: `pnpm pipeline run --year 1650` を実行し PMTiles 生成を確認
5. 準備ができればデプロイ/デモ - コアパイプラインが機能

### インクリメンタルデリバリー

1. セットアップ + 基盤 → 基盤準備完了
2. US1 追加 → テスト: `pnpm pipeline run` でタイル生成 → **MVP!**
3. US2 追加 → テスト: 不正な GeoJSON が検出され、レポートが生成される
4. US4 追加 → テスト: index.json が自動生成され、タイルと一致する
5. US3 追加 → テスト: 変更ファイルのみが R2 にアップロードされる
6. 仕上げ → 統合テスト、レガシースクリプト削除、quickstart 検証

### 主要な設計判断（research.md より）

- **tippecanoe**: `execFile`（シェル不使用、インジェクション安全）
- **ファイルロック**: `mkdir` アトミック + PID + mtime stale 検出（外部依存なし）
- **チェックポイント**: 単一 JSON ファイル + アトミック書き込み（temp + rename）
- **バリデーション**: `@turf/turf` のみ（既存依存、JSTS 内包）
- **ハッシュ**: `node:crypto` による SHA-256（ファイル名に 8 文字 hex）
- **CLI 実行**: `tsx`（esbuild ベース、ESM ネイティブ）
- **Git 操作**: `execFile('git', ...)`（simple-git 依存なし）
- **マニフェスト**: 後方互換の `files` + 新規 `metadata` フィールド

---

## 備考

- [P] タスク = 異なるファイル、未完了タスクへの依存なし
- [Story] ラベルはトレーサビリティのためタスクをユーザーストーリーに紐付け
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが失敗することを確認（TDD）
- 各タスクまたは論理グループごとにコミット
- 任意のチェックポイントで停止し、ストーリーを独立に検証可能
