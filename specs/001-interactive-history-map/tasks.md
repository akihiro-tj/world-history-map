# タスク一覧: インタラクティブ世界史地図

**入力**: `/specs/001-interactive-history-map/` の設計ドキュメント
**前提**: plan.md, spec.md, research.md, data-model.md

**テスト**: TDD必須（Constitution原則I）。各ユーザーストーリーにテストタスクを含む。

**構成**: タスクはユーザーストーリーごとにグループ化し、独立した実装・テストを可能にする。

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（別ファイル、依存なし）
- **[Story]**: 対象ユーザーストーリー（例: US1, US2, US3, US4）
- 説明には正確なファイルパスを含める

## パス規約

- **フロントエンド**: リポジトリルートの `src/`
- **テスト**: リポジトリルートの `tests/`
- **静的データ**: `public/pmtiles/`

---

## フェーズ1: セットアップ（共通インフラ）

**目的**: プロジェクト初期化と基本構造の構築

- [ ] T001 Vite + React + TypeScriptプロジェクトを初期化: `pnpm create vite@latest . --template react-ts`
- [ ] T002 `tsconfig.json` でTypeScript strictモードを設定
- [ ] T003 [P] `biome.json` でBiomeをインストール・設定
- [ ] T004 [P] `tailwind.config.ts` でTailwind v4をインストール・設定
- [ ] T005 [P] shadcn/uiを初期化: `pnpm dlx shadcn@latest init`
- [ ] T006 [P] MapLibre GL JSとreact-map-glをインストール: `pnpm add maplibre-gl react-map-gl pmtiles`
- [ ] T007 [P] テスト依存関係をインストール: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test`
- [ ] T008 `vitest.config.ts` でVitestを設定
- [ ] T009 [P] `playwright.config.ts` でPlaywrightを設定
- [ ] T010 plan.mdに従って `src/` に基本プロジェクト構造を作成

---

## フェーズ2: 基盤構築（ブロッキング前提条件）

**目的**: 全ユーザーストーリーの実装前に完了必須のコアインフラ

**重要**: このフェーズが完了するまでユーザーストーリーの作業は開始不可

- [ ] T011 `src/types/index.ts` にTypeScript型を定義（YearEntry, YearIndex, TerritoryProperties, TerritoryDescription, AppState）
- [ ] T012 [P] `src/hooks/usePMTilesProtocol.ts` にPMTilesプロトコル登録フックを作成
- [ ] T013 [P] `src/utils/yearIndex.ts` に年代インデックスローダーを作成
- [ ] T014 `src/contexts/AppStateContext.tsx` にアプリ状態コンテキストを作成
- [ ] T015 `src/styles/mapStyle.ts` にベース地図スタイル設定を作成
- [ ] T016 [P] historical-basemaps GeoJSONをダウンロードし、`scripts/convert-to-pmtiles.sh` にPMTiles変換スクリプトを作成
- [ ] T017 1650年（MVPデフォルト）のPMTilesを `public/pmtiles/world_1650.pmtiles` に生成
- [ ] T018 `public/pmtiles/index.json` に利用可能な年代メタデータを作成

**チェックポイント**: 基盤完了 - ユーザーストーリーの実装開始可能

---

## フェーズ3: ユーザーストーリー1 - 地図の閲覧と操作 (優先度: P1) MVP

**ゴール**: ユーザーが世界地図上で1650年の領土分布を確認し、ズーム・パンで詳細を見られる

**独立テスト**: 地図を開き、ズーム・パン操作ができ、領土の境界と名称ラベルが表示されることを確認

### ユーザーストーリー1のテスト

> **注意: これらのテストを先に書き、実装前に失敗することを確認**

- [ ] T019 [P] [US1] E2Eテスト: 初期表示で1650年の領土が表示される `tests/e2e/map-display.spec.ts`
- [ ] T020 [P] [US1] E2Eテスト: ズーム・パン操作が動作する `tests/e2e/map-interaction.spec.ts`
- [ ] T021 [P] [US1] ユニットテスト: MapViewコンポーネントが正しくレンダリングされる `tests/unit/components/MapView.test.tsx`
- [ ] T022 [P] [US1] ユニットテスト: TerritoryLayerが色付きで領土を表示する `tests/unit/components/TerritoryLayer.test.tsx`

### ユーザーストーリー1の実装

- [ ] T023 [P] [US1] `src/components/Map/MapView.tsx` にMapViewコンポーネントを作成
- [ ] T024 [P] [US1] `src/components/Map/TerritoryLayer.tsx` にTerritoryLayerコンポーネントを作成
- [ ] T025 [P] [US1] `src/components/Map/TerritoryLabel.tsx` にTerritoryLabelコンポーネントを作成
- [ ] T026 [US1] `src/hooks/useMapData.ts` にPMTilesロード用useMapDataフックを作成
- [ ] T027 [US1] `src/utils/colorScheme.ts` にSUBJECTOプロパティに基づく領土カラースキームを実装
- [ ] T028 [US1] App.tsxにMapViewを統合し、1650年を初期表示
- [ ] T029 [US1] 地図のキーボードナビゲーション対応（矢印キーでパン、+/-でズーム）
- [ ] T030 [US1] 地図コンポーネントにアクセシビリティ用aria-labelを追加

**チェックポイント**: ユーザーストーリー1完了 - 地図表示、ズーム・パン動作、領土とラベルが表示

---

## フェーズ4: ユーザーストーリー2 - 年代の選択と変更 (優先度: P2)

**ゴール**: ユーザーが年代セレクターで異なる年を選択し、地図が更新される

**独立テスト**: 年代セレクターで異なる年を選択し、地図上の領土表示が変化することを確認

### ユーザーストーリー2のテスト

- [ ] T031 [P] [US2] E2Eテスト: 年代セレクターが利用可能な年代を表示する `tests/e2e/year-selector.spec.ts`
- [ ] T032 [P] [US2] E2Eテスト: 年代選択で地図の領土が更新される `tests/e2e/year-change.spec.ts`
- [ ] T033 [P] [US2] ユニットテスト: YearSelectorコンポーネント `tests/unit/components/YearSelector.test.tsx`
- [ ] T034 [P] [US2] ユニットテスト: useYearNavigationフック `tests/unit/hooks/useYearNavigation.test.ts`

### ユーザーストーリー2の実装

- [ ] T035 [P] [US2] `src/components/YearSelector/YearSelector.tsx` にYearSelectorコンポーネントを作成
- [ ] T036 [US2] `src/hooks/useYearNavigation.ts` にuseYearNavigationフックを作成
- [ ] T037 [US2] YearSelectorに選択中の年代を中央にスクロールする横スクロールを実装
- [ ] T038 [US2] YearSelectorにキーボードナビゲーション（左右矢印キー）を追加
- [ ] T039 [US2] YearSelectorをAppStateに接続し、年代変更時に地図データを再読み込み
- [ ] T040 [US2] `src/components/ui/LoadingOverlay.tsx` に年代遷移中のローディングインジケーターを追加
- [ ] T041 [US2] テスト用に追加の年代（少なくとも5つ）のPMTilesを生成

**チェックポイント**: ユーザーストーリー2完了 - 年代セレクター動作、年代変更で地図更新

---

## フェーズ5: ユーザーストーリー3 - 領土情報の表示 (優先度: P3)

**ゴール**: ユーザーが領土をクリックして歴史的説明を読み、年代リンクから別の時代にジャンプできる

**独立テスト**: 領土クリックで説明パネル表示、年代リンククリックで地図遷移を確認

### ユーザーストーリー3のテスト

- [ ] T042 [P] [US3] E2Eテスト: 領土クリックで情報パネルが表示される `tests/e2e/territory-info.spec.ts`
- [ ] T043 [P] [US3] E2Eテスト: 説明内の年代リンクでその年代に遷移する `tests/e2e/year-link-navigation.spec.ts`
- [ ] T044 [P] [US3] ユニットテスト: TerritoryInfoPanelコンポーネント `tests/unit/components/TerritoryInfoPanel.test.tsx`
- [ ] T045 [P] [US3] ユニットテスト: 領土説明の読み込み `tests/unit/hooks/useTerritoryDescription.test.ts`

### ユーザーストーリー3の実装

- [ ] T046 [P] [US3] `src/components/TerritoryInfo/TerritoryInfoPanel.tsx` にTerritoryInfoPanelコンポーネントを作成
- [ ] T047 [US3] `src/hooks/useTerritoryDescription.ts` にuseTerritoryDescriptionフックを作成
- [ ] T048 [US3] TerritoryLayerに領土選択用のクリックハンドラを実装
- [ ] T049 [US3] `src/components/TerritoryInfo/YearLink.tsx` にクリック可能な年代参照用YearLinkコンポーネントを作成
- [ ] T050 [US3] `src/components/TerritoryInfo/AINotice.tsx` にAI生成表示コンポーネントを追加
- [ ] T051 [US3] `src/data/descriptions/1650.json` に1650年のサンプル領土説明を作成
- [ ] T052 [US3] 「説明がありません」状態をプレースホルダーメッセージで処理
- [ ] T053 [US3] パネル閉じるボタンとキーボードEscapeハンドリングを追加

**チェックポイント**: ユーザーストーリー3完了 - 領土情報パネルが年代ナビゲーション付きで動作

---

## フェーズ6: ユーザーストーリー4 - ライセンス・免責事項の確認 (優先度: P4)

**ゴール**: ユーザーがライセンス情報と免責事項を確認できる

**独立テスト**: ライセンスリンククリックでモーダル表示、GPL-3.0と免責事項が記載されていることを確認

### ユーザーストーリー4のテスト

- [ ] T054 [P] [US4] E2Eテスト: ライセンスリンクで免責事項モーダルが開く `tests/e2e/license-disclaimer.spec.ts`
- [ ] T055 [P] [US4] ユニットテスト: LicenseDisclaimerコンポーネント `tests/unit/components/LicenseDisclaimer.test.tsx`

### ユーザーストーリー4の実装

- [ ] T056 [P] [US4] `src/components/Legal/LicenseDisclaimer.tsx` にLicenseDisclaimerモーダルコンポーネントを作成
- [ ] T057 [US4] Appのヘッダーまたはフッターにライセンストリガーリンク/ボタンを追加
- [ ] T058 [US4] 免責事項コンテンツを作成:
  - historical-basemaps GPL-3.0帰属表示
  - データ精度の免責事項（作業中のプロジェクト、他のソースとの照合を推奨）
  - 歴史的国境の概念的限界
  - 係争地域の注意書き
- [ ] T059 [US4] キーボードアクセシビリティを追加（Escapeで閉じる、フォーカストラップ）

**チェックポイント**: ユーザーストーリー4完了 - ライセンスと免責事項情報がアクセス可能

---

## フェーズ7: 仕上げ・横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善

- [ ] T060 [P] `wrangler.toml` またはダッシュボードでCloudflare Pagesデプロイを設定
- [ ] T061 [P] `.github/workflows/ci.yml` にテストとリンティングのCIワークフローを追加
- [ ] T062 [P] Playwrightテストでaxe-coreアクセシビリティ監査を実行
- [ ] T063 [P] `index.html` にメタタグとOpen Graphデータを追加
- [ ] T064 パフォーマンス最適化: Lighthouseで初期読み込み3秒以内を確認
- [ ] T065 [P] historical-basemapsの全利用可能年代のPMTilesを生成
- [ ] T066 コードクリーンアップとテストカバレッジ80%を確認
- [ ] T067 quickstart.mdの検証を実行し、必要に応じて更新

---

## 依存関係と実行順序

### フェーズ依存関係

- **セットアップ（フェーズ1）**: 依存なし - 即座に開始可能
- **基盤構築（フェーズ2）**: セットアップ完了に依存 - 全ユーザーストーリーをブロック
- **ユーザーストーリー（フェーズ3-6）**: 全て基盤構築フェーズ完了に依存
  - 優先度順に進行可能（P1 → P2 → P3 → P4）
  - またはチームキャパシティがあれば並列実行も可能
- **仕上げ（フェーズ7）**: 全ユーザーストーリー完了に依存

### ユーザーストーリー依存関係

- **ユーザーストーリー1 (P1)**: 基盤構築後に開始可能 - 他ストーリーへの依存なし
- **ユーザーストーリー2 (P2)**: 基盤構築後に開始可能 - US1の地図コンポーネントと統合
- **ユーザーストーリー3 (P3)**: 基盤構築後に開始可能 - US1の地図とUS2の年代ナビゲーションと統合
- **ユーザーストーリー4 (P4)**: 基盤構築後に開始可能 - 他ストーリーから独立

### 各ユーザーストーリー内

- テストは実装前に書き、失敗することを確認（TDD）
- コンポーネントはそれを使用するフックより先に
- コア実装は統合より先に
- 次の優先度に移る前にストーリーを完了

### 並列実行の機会

- [P]マークのセットアップタスクは全て並列実行可能
- [P]マークの基盤構築タスクは全て並列実行可能
- 各ユーザーストーリーの[P]マークのテストは全て並列実行可能
- 各ストーリー内の[P]マークのコンポーネントは並列実行可能

---

## 並列実行例: ユーザーストーリー1

```bash
# ユーザーストーリー1の全テストを同時に起動:
タスク: T019 "E2Eテスト: 初期表示で1650年の領土が表示される"
タスク: T020 "E2Eテスト: ズーム・パン操作が動作する"
タスク: T021 "ユニットテスト: MapViewコンポーネントが正しくレンダリングされる"
タスク: T022 "ユニットテスト: TerritoryLayerが色付きで領土を表示する"

# ユーザーストーリー1の全コンポーネントを同時に起動:
タスク: T023 "MapViewコンポーネントを作成"
タスク: T024 "TerritoryLayerコンポーネントを作成"
タスク: T025 "TerritoryLabelコンポーネントを作成"
```

---

## 実装戦略

### MVPファースト（ユーザーストーリー1のみ）

1. フェーズ1: セットアップを完了
2. フェーズ2: 基盤構築を完了（重要 - 全ストーリーをブロック）
3. フェーズ3: ユーザーストーリー1を完了
4. **停止して検証**: ユーザーストーリー1を独立してテスト
5. Cloudflare Pagesにデプロイ - MVP完成！

### インクリメンタルデリバリー

1. セットアップ + 基盤構築を完了 → 基盤準備完了
2. ユーザーストーリー1を追加 → 独立テスト → デプロイ（MVP: 1650年の領土を表示する地図）
3. ユーザーストーリー2を追加 → 独立テスト → デプロイ（年代選択を追加）
4. ユーザーストーリー3を追加 → 独立テスト → デプロイ（領土情報を追加）
5. ユーザーストーリー4を追加 → 独立テスト → デプロイ（法的情報を追加）
6. 各ストーリーは前のストーリーを壊さずに価値を追加

---

## 備考

- [P]タスク = 別ファイル、依存なし
- [Story]ラベルはタスクを特定のユーザーストーリーにマッピング（トレーサビリティ用）
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが失敗することを確認（Constitution準拠のTDD）
- 各タスクまたは論理グループ完了後にコミット
- 任意のチェックポイントで停止してストーリーを独立検証可能
- ブランチ戦略: 各タスクごとに `task/###-task-name` ブランチを作成し、mainにPR
