# Implementation Plan: Camera Fit on Territory Select

**Branch**: `241-camera-fit-on-territory-select` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/241-camera-fit-on-territory-select/spec.md`

## Summary

領土選択時に、選択領土の **主要部分（本土）** が `TerritoryInfoPanel`（Desktop の左側固定パネル / Mobile の `BottomSheet`）に隠れない可視領域へ収まるよう、`apps/frontend` のマップカメラを自動でフィット移動させる。
`state.activePanel.selectedTerritory` の変化を契機に、PMTiles の Feature プロパティとして埋め込まれた **主要ポリゴンの bounding box** を読み出し、`mapRef.fitBounds()` をデバイス別 padding と最大ズーム上限付きで呼び出す。
パネルを閉じたときはカメラ位置を維持する（戻し処理は実装しない）。

bbox 算出は `apps/pipeline` の既存 `mergeByName()` を拡張し、ラベル位置算出と同じ「最大面積ポリゴン」を流用してビルド時に Feature プロパティに格納する。
これによりアメリカ・ロシア・イギリスのような飛び地を持つ領土で、フィット結果が地球規模にズームアウトする問題を回避する。
`apps/worker` / `packages/tiles` には触れない（タイル URL に hash が混じる仕組みは既存通り維持）。

## Technical Context

**Language/Version**: TypeScript 5.x（既存ワークスペース）

**Primary Dependencies**:
- Frontend: `react-map-gl/maplibre` ^8.1（既存。`MapRef` 経由で MapLibre インスタンスへアクセス）、`maplibre-gl` ^5.24（既存。`fitBounds`）、React 19.2（既存）、Tailwind CSS（既存。padding 値はクラス由来の数値定数として TS 側で参照）、Vitest + Testing Library（既存テスト構成）
- Pipeline: `@turf/turf`（既存。`mergeByName` で `area` / `pointOnFeature` を既に使用しており、`bbox` 関数を追加で利用）

**Storage**:
- カメラ状態：既存の MapLibre インスタンス + `state.mapView` のみで管理（変更なし）
- 領土の bbox：PMTiles の `territories` レイヤの Feature プロパティに埋め込み（タイル再ビルドが必要、ストレージ自体の追加は無し）

**Testing**:
- Vitest + Testing Library（hook / コンポーネント / 純関数の単体テスト）
- Storybook：本機能は MapLibre インスタンスへの副作用が中心のため story の追加は最小限とし、視覚回帰のスコープ外

**Target Platform**: モダンブラウザ（PC・タブレット・モバイル）。SSR なしの SPA

**Project Type**: 既存 web monorepo の `apps/frontend` + `apps/pipeline` 修正（最小拡張：merge 段階に bbox 算出を 1 関数追加）

**Performance Goals**（spec 由来）:
- 選択 → カメラ移動完了の体感所要時間：**800ms 以内**（SC-003）
- 連続選択時のアニメーション競合解消：最後の選択に収束（FR-010）
- 既存の地図操作性（pan / zoom / クリック判定）に regression を出さない

**Constraints**:
- frontend に新規外部依存追加なし（bbox は Feature プロパティから読むだけのため `@turf/*` 不要）
- pipeline は既存の `@turf/turf` を流用（依存追加なし）
- `state.mapView` は本機能で書き換えない（カメラ移動は MapLibre インスタンスへの命令で行い、副作用を React state ループに持ち込まない）
- a11y 最低ライン：カメラ移動はユーザーの能動操作（クリック / ナビゲーション選択）に紐付くため `prefers-reduced-motion` に従い `easeTo` の `duration` を 0 に切り替え可能とする
- bundle size：frontend 側は純関数 + 1 hook の追加で +2KB 以下を目安
- タイル再ビルド：本機能の merge 拡張により全年代のタイル再生成が必要。`pnpm pipeline run --years <range>` の運用負荷は spec 範囲外だが、`packages/tiles` の hash が変わることだけは plan で認識

**Scale/Scope**:
- 対象領土：`historical-basemaps` 全年代の全領土（最大規模ではモンゴル帝国〜現代ロシア。最小規模は都市国家）
- `apps/frontend/src/components/map/` 配下と `domain/territory/` の小規模追加（フィット副作用 hook + padding 算出 hook）
- `apps/pipeline/src/tiles/merge.ts` への小規模追加（最大ポリゴンの bbox を properties に格納）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Posture | Resolution |
|-----------|---------|------------|
| **I. Specification-Driven Change** | ✅ Conform | spec.md と本 plan を経由。decision log は research.md に集約 |
| **II. Automated Quality Gates** | ✅ Conform | 既存の `pnpm test && pnpm check && pnpm typecheck` ですべての gate が走り、追加コードもこれでブロックされる |
| **III. Behavior-First Testing** | ✅ Conform | bbox 計算（純関数）、padding 決定（純関数）、フィット起動 hook（副作用）の 3 層で behavior test を実装より先に書く。既存パターン（`use-territory-description.test.ts` など）を踏襲 |
| **IV. Consistent User Experience** | ✅ Conform | 既存パネルレイアウトと衝突しない padding 算出により、選択 → 視認 という主要動線の予測可能性を高める。新規 UI コンポーネントは追加せず、`prefers-reduced-motion` を尊重して a11y を保つ |
| **V. Performance as a Budget** | ✅ Conform | 体感予算 800ms（SC-003）と「regression なし」を本 plan で予算として明示。`querySourceFeatures` は対象タイルが既に表示済みであることを前提とし、未表示時の fallback は research.md で確定 |

**Initial Constitution Check: PASS**（waiver なし）

## Project Structure

### Documentation (this feature)

```text
specs/241-camera-fit-on-territory-select/
├── plan.md                            # This file
├── research.md                        # Phase 0 output
├── data-model.md                      # Phase 1 output（in-memory 型 + Feature プロパティ契約）
├── quickstart.md                      # Phase 1 output
├── contracts/
│   └── territory-feature-bbox.md      # Phase 1 output（pipeline → frontend の Feature プロパティ契約）
├── checklists/
│   └── requirements.md                # 既存
└── spec.md                            # 既存
```

contracts/ は **pipeline 出力 → frontend 入力** の Feature プロパティ契約（`BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM`）を確定するために作成する。pipeline と frontend で型定義が独立して保たれるため（CLAUDE.md「Types are duplicated across apps」）、契約ファイルが両者の同期点となる。

### Source Code (repository root)

```text
apps/frontend/src/
├── components/
│   └── map/
│       ├── map-view.tsx                              # 改修：camera-fit hook の呼び出し追加
│       └── hooks/
│           ├── use-camera-fit-on-selection.ts        # 新規：activePanel + selectedYear を観測し fitBounds を発火
│           ├── use-camera-fit-on-selection.test.tsx  # 新規：契機・スキップ条件・キャンセルの behavior テスト
│           └── use-panel-padding.ts                  # 新規：Desktop/Mobile レイアウトに応じた padding を返す
├── domain/
│   └── territory/
│       ├── territory-bounds.ts                       # 新規：Feature.properties (BBOX_W/S/E/N/AM) 読み出し + 検証の純関数
│       └── territory-bounds.test.ts                  # 新規
└── styles/
    └── map-style.ts                                  # 改修：MAX_FIT_ZOOM などの定数を追加

apps/pipeline/src/
└── tiles/
    ├── merge.ts                                      # 改修：mergeByName 内の最大ポリゴン検出時に bbox を properties に格納
    └── merge.test.ts                                 # 改修：BBOX_W/S/E/N/AM の出力検証ケースを追加
```

新規作成・改修対象は **frontend 6 ファイル + pipeline 2 ファイル**（新規 5、改修 3）の見込み。

**Structure Decision**:
- **bbox の生成は pipeline 側に集約**：既存 `mergeByName` の最大ポリゴン検出ロジック（`largestPoly`）の隣に `turf.bbox` 呼び出しを追加し、結果を Feature.properties に格納する。Tippecanoe にプロパティを保持させるため `KEPT_PROPERTIES` セットを拡張。
- **bbox の消費は domain/territory に集約**：frontend では `Feature.properties` から `BBOX_W/S/E/N/AM` を読み、検証して `TerritoryBounds` 型に変換する純関数を `domain/territory/` に置く。これは「領土」という業務概念に紐付くため `domain/` 配下が適切。
- **カメラフィットの副作用** は `components/map/hooks/` に置く（`mapRef` への命令と React lifecycle の橋渡しが本質で、ドメインから切り離す）。
- **padding 算出** は MapLibre レイヤーの命令引数であり View 層の関心事のため、`components/map/hooks/` に配置。
- **`state.mapView` には手を加えない**（カメラ移動は uncontrolled な MapLibre インスタンスへの命令で完結し、reducer / context をまたがらない）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

該当なし（initial check で全 principle が PASS）。

## Phase 0: Research Topics

以下のトピックを `research.md` で解決する：

1. **bbox 生成の責任分担**：飛び地を持つ領土（アメリカ・ロシア・イギリス）でフィット結果が地球規模に拡大する問題を回避するため、pipeline 側の `mergeByName` で **最大ポリゴンの bbox** を Feature プロパティに格納する。プロパティ名・型・Tippecanoe での保持戦略・既存 `KEPT_PROPERTIES` セットへの追加方法を確定。
2. **日付変更線をまたぐ領土への対応**：ロシア・フィジー・キリバスなど主要ポリゴン自体が antimeridian をまたぐケースで、`turf.bbox` の素朴計算では west = -180, east = 180 になってしまう。pipeline 側で antimeridian 検出と `east > 180` 形式への正規化を行い、その判定結果を `BBOX_AM` プロパティとして frontend に伝達する。
3. **パネル占有領域から `fitBounds` の padding 算出**：Desktop は `TerritoryInfoPanel` の `left-4 top-4 w-96 max-w-[calc(100vw-2rem)]` から決まる占有矩形、Mobile は `BottomSheet` の表示高さ（snap point）からそれぞれ padding 値を算出。Tailwind / レイアウト定数の参照経路と「ピクセル余白の追加マージン」の妥当値を決定。
4. **最大ズーム上限値の決定**：spec の「過度にズームインしない」を満たす具体値（例: zoom 5〜6）。実データ（パリのような都市）で fit 結果を確認して確定。
5. **アニメーションキャンセルの確認**：`fitBounds` の連続呼び出し時に MapLibre が前回アニメーションをキャンセルすることを確認。レースコンディションが残る場合は AbortController 相当の制御を hook 側で実装するかを判断。
6. **bbox プロパティの取得経路**：pipeline で埋め込まれた bbox を frontend で参照する方法を確定。クリック由来は `event.features[0].properties` から、非クリック（SummaryNavStrip）由来は `mapRef.querySourceFeatures` で同 NAME のフィーチャを 1 件取得すれば properties に同値が入る。タイル未読込時の fallback 戦略を決定。
7. **選択解除（panel close）時のカメラ位置維持**：FR-007 を担保するため、副作用 hook の deps に `selectedTerritory` を入れ、`null` への遷移時はフィットを発火しないガード設計を確定。
8. **prefers-reduced-motion**：`easeTo` の `duration` を 0 に切り替える条件と、media query の購読方法。

## Phase 1: Design Outputs

- **`data-model.md`**：`TerritoryBounds`、`PaddingInsets`、`CameraFitOptions` の in-memory 型定義と、計算上の不変条件（bbox の正規化、padding が 0 以上、maxZoom が `MAP_CONFIG.minZoom` 以上）。AppState には新規プロパティを追加しない方針も明記。
- **`contracts/territory-feature-bbox.md`**：pipeline → PMTiles → frontend の Feature プロパティ契約。プロパティ名・型・正規化ルール・antimeridian フラグの定義。pipeline と frontend で型が独立しているため、契約ファイルが両者の同期点となる。
- **`quickstart.md`**：開発者向けに「ローカルで本機能を動作確認するまで」の最短手順（タイル再ビルド → 地図表示 → 領土クリック → カメラ移動の確認、reduced-motion 切替、Mobile レイアウトでの確認、飛び地ケースの確認）。

## Out of Plan Scope

- パネル閉鎖時のカメラ復帰（spec Out of Scope と整合）
- 年代切替で同一領土が消えたときのカメラ復帰
- ハイライトの中心点インジケータ等の付随的視覚演出
- BottomSheet の高さ変化に追随したリアルタイム再フィット（FR-010）
- マウスホバーやキーボードフォーカスでの仮選択に対するカメラ移動
- クリックされた具体的な構成部分（本土 / 飛び地）への切り替え。常に最大ポリゴンへのフィットで割り切る（spec Out of Scope と整合）
- pipeline 拡張による既存タイル成果物の再ビルド運用（CI/CD 連携などは本機能の範囲外。手動 `pnpm pipeline run` で対応）

## Post-Design Constitution Check

**Re-evaluated after Phase 1 (2026-05-10)**

| Principle | Posture | Notes |
|-----------|---------|-------|
| **I. Specification-Driven Change** | ✅ Conform | research.md / data-model.md / contracts/ / quickstart.md にすべての設計判断を記録。pipeline ↔ frontend 間の同期点が contract ファイルとして明示される |
| **II. Automated Quality Gates** | ✅ Conform | 新規追加コードは既存の Biome / Vitest / TypeScript gate でブロックされる。pipeline 側にも同等の gate が走る。新規ファイルは kebab-case 命名・`@/` alias 利用を遵守 |
| **III. Behavior-First Testing** | ✅ Conform | quickstart.md の手順 4 で必要なテスト（pipeline merge の bbox 出力、frontend 側 bbox 読み出し、padding 算出、フィット契機、解除時の非発火、antimeridian、reduced-motion）を列挙し、実装より先に書く |
| **IV. Consistent User Experience** | ✅ Conform | UI レイアウトに変更を加えず、既存の選択フロー上にカメラ追従を重ねる設計のため UX 言語との衝突は無い。飛び地時の挙動はラベル表示（最大ポリゴン優先）と一貫。a11y は reduced-motion 対応で担保 |
| **V. Performance as a Budget** | ✅ Conform | 800ms / 競合解消 / regression なしの 3 予算を quickstart のチェック項目として運用。bbox は pipeline ビルド時に計算済みのため frontend 側の実行時コストは O(1) |

**Post-Design Constitution Check: PASS**（waiver なし、Complexity Tracking の追記不要）

Phase 2（`tasks.md`）への移行可能。
