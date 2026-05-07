# Quickstart: 年代サマリーパネル

**Feature**: 年代サマリーパネル
**Date**: 2026-05-07
**Audience**: 本機能を実装する開発者 / デザイナー / コンテンツ整備担当

新しい年代の era-summary を追加してパネルに反映するまでの **最短手順**。

## 前提

- 本リポジトリのワークスペースが `pnpm install` 済み
- `apps/frontend`、`apps/pipeline` の両方が動作する状態
- 既存の `descriptions/{year}.json` が当該年について整備済み（era-summary 生成のソース）

## 手順 1：データを 1 件追加する（手動編集）

**用途**: AI 生成を待たずに手早く確認したい場合 / プロトタイプ確認

1. `apps/frontend/public/data/era-summaries/{year}.json` を新規作成（例：`1500.json`）
2. [contracts/era-summary-data.md](./contracts/era-summary-data.md) のサンプルをコピー
3. `year` をファイル名と一致させ、`regions` を 1 件以上書く
4. `pnpm --filter @world-history-map/frontend run dev` で開発サーバを起動
5. 年代セレクターで対象年を選び、サマリーパネルが該当データで描画されることを確認

```bash
# 例
cd apps/frontend
echo '{ "year": 1500, "regions": [...] }' > public/data/era-summaries/1500.json
pnpm dev
```

## 手順 2：データを Pipeline で生成する（実装後）

**用途**: 全年代を一括整備 / 領土データ更新後の再生成

1. `apps/pipeline` の era-summary-generate サブコマンドを使う：

```bash
# 単一年
pnpm pipeline era-summary-generate --year 1500

# 範囲
pnpm pipeline era-summary-generate --years 1300..1700

# 全年代（インクリメンタル：領土データに変更がある年だけ再生成）
pnpm pipeline era-summary-generate --all
```

2. 生成された JSON は `apps/frontend/public/data/era-summaries/{year}.json` に書き出される
3. 確認は手順 1 と同様

> Pipeline の Cache: 領土データ（`descriptions/{year}.json`）の hash が変わった年のみ再処理される。
> 強制再生成したい場合は `.cache/pipeline-state.json` の該当エントリを削除する。

## 手順 3：パネルを視覚的に確認する（Storybook）

```bash
pnpm storybook
```

`era-summary-panel` のストーリー：

- **Default**：1500 年の標準的な状態（7 区分すべて埋まる）
- **Sparse**：データが少ない年代（オセアニア欠損など）
- **Empty**：当該年代のデータが未提供（FR-007 fallback 表示）
- **Loading**：取得中のスピナー
- **Mobile**：bottom-sheet として表示

## 手順 4：パネル間の遷移をエンドツーエンドで確認する

開発サーバ（`pnpm dev`）で：

1. デスクトップでアプリを開く → サマリーパネルが開いた状態でスタート（FR-003）
2. サマリー内のリンク（例：「ポルトガル」）をクリック → サマリーが閉じ、領土詳細パネルが開く（FR-006 後勝ち排他）
3. 領土詳細パネル上端の「1500 年の世界を見る」をクリック → 領土詳細が閉じ、サマリーが再表示（FR-011）
4. サマリー右上の `×` をクリック → サマリーが閉じる
5. 左上の「サマリーを開く」トリガーをクリック → サマリーが再度開く

モバイル（`F12` の DevTools でモバイルビュー）：

1. 初期状態でサマリー閉、右下にトリガー FAB が表示（FR-003）
2. FAB タップ → bottom-sheet でサマリー表示
3. サマリー内のリンクタップ → サマリー閉、領土詳細 bottom-sheet 表示（後勝ち排他）
4. 領土詳細 bottom-sheet 上端の「1500 年の世界を見る」帯タップ → サマリー再表示（FR-011）

## 手順 5：テストを実行する

```bash
# 全テスト
pnpm test

# 本機能関連のみ
pnpm --filter @world-history-map/frontend test era-summary
```

期待されるテスト：

- `era-summary-panel.test.tsx`：パネルの表示・閉じる・年代切替時の更新
- `app-state-context.test.tsx`：後勝ち排他の遷移（既存テストへ追加）
- `region-card.test.tsx`：参照リンクの解決と描画

## 手順 6：a11y を確認する

1. キーボードのみで以下が可能か確認：
   - `Tab` でサマリーパネル → 領土詳細パネルへフォーカス移動
   - `Enter` / `Space` で開閉ボタン・遷移帯ボタン・参照リンクが動作
   - `Escape` でデスクトップパネル閉（既存 `useEscapeKey` パターン）

2. スクリーンリーダーで以下が読み上げられるか確認：
   - パネルタイトル（`aria-labelledby` 経由）
   - 開閉状態の変化（`role="dialog"` または `aria-expanded`）
   - 遷移帯ボタンの目的（「サマリーを開く」相当）

## トラブルシューティング

### Q. 年代を切り替えてもサマリー内容が更新されない

- `useEraSummary(year)` の `year` props が AppState の `selectedYear` と連動しているか確認
- ブラウザのネットワークタブで `era-summaries/{new-year}.json` の fetch が走っているか確認
- 該当年の JSON ファイルが存在しない場合は FR-007 の fallback が出るはず（出ない場合は `loadEraSummary` の null ハンドリング不備）

### Q. サマリーと領土詳細が両方同時に開いてしまう

- AppState の `isSummaryPanelOpen` と `isInfoPanelOpen` が同時に `true` になっている
- reducer 内の `SELECT_TERRITORY` で `isSummaryPanelOpen: false` を、`OPEN_SUMMARY` で `isInfoPanelOpen: false` を返しているか確認
- `app-state-context.test.tsx` の不変条件テストが落ちていないかチェック

### Q. モバイルで bottom-sheet がチラつく

- 排他の切り替え時にアニメーション同士が干渉している可能性
- 既存 `useBottomSheetSnap` の状態管理に依存。両方を同時にマウントしないよう、`isOpen === false` のとき bottom-sheet 自体を unmount する（既存実装と整合）

## 関連ドキュメント

- [spec.md](./spec.md)：機能仕様
- [plan.md](./plan.md)：実装計画
- [research.md](./research.md)：設計選択の調査
- [data-model.md](./data-model.md)：型定義と状態遷移
- [contracts/era-summary-data.md](./contracts/era-summary-data.md)：JSON 契約
