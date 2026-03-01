# クイックスタート: 領土情報パネル リデザイン

**ブランチ**: `004-territory-info-redesign`

## 前提条件

- Node.js 22.x LTS
- pnpm
- Google スプレッドシートに領土データ（「リンクを知っている全員が閲覧可能」に設定）

## 開発ワークフロー

### 1. データ同期（パイプライン）

```bash
# Google スプレッドシートから領土説明データを JSON に同期
pnpm pipeline sync-descriptions

# 特定の年のみ同期
pnpm pipeline sync-descriptions --year 1700

# すべての説明データファイルをバリデーション
pnpm pipeline validate-descriptions
```

### 2. フロントエンド開発

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# リント & フォーマットチェック
pnpm check
```

### 3. 主要な変更対象ファイル

#### データモデル（型定義）
- `apps/frontend/src/types/territory.ts` -- インターフェースの更新

#### データ取得
- `apps/frontend/src/components/territory-info/hooks/use-territory-description.ts` -- 新スキーマへの適応

#### UI コンポーネント

> **実装ルール**: UI コンポーネントの新規作成・変更時は `/ui-ux-pro-max` スキルを使用すること。デザインシステム検索（`--design-system`）でスタイル・カラー・タイポグラフィの推奨を取得し、スタック検索（`--stack html-tailwind`）で Tailwind ベストプラクティスを確認する。UI モックアップは `plan.md` の「UI モックアップ」セクションを参照。

- `apps/frontend/src/components/territory-info/territory-info-panel.tsx` -- パネルレイアウトの再設計
- 新規: `apps/frontend/src/components/territory-info/territory-profile.tsx` -- プロフィールのキー・バリュー表示
- 新規: `apps/frontend/src/components/territory-info/territory-timeline.tsx` -- 時間的分類付きタイムライン
- 新規: `apps/frontend/src/components/territory-info/territory-context.tsx` -- 文脈テキスト表示

#### データパイプライン
- `apps/pipeline/src/cli.ts` -- `sync-descriptions` コマンド追加
- 新規: `apps/pipeline/src/stages/sync-descriptions.ts` -- Google Sheets CSV 取得 + JSON 変換
- 新規: `apps/pipeline/src/stages/validate-descriptions.ts` -- Zod ベースのデータバリデーション

#### データファイル
- `apps/frontend/public/data/descriptions/*.json` -- すべて削除して、スプレッドシートから再作成

### 4. データフロー

```
Google スプレッドシート（マスターデータ）
  ↓ CSV エクスポート URL（公開、認証不要）
  ↓ fetch + csv-parse
パイプライン（sync-descriptions）
  ↓ バリデーション（Zod スキーマ）
  ↓ 年ごとにグルーピング
  ↓ JSON 書き出し
public/data/descriptions/{year}.json
  ↓ fetch（ブラウザ）
フロントエンド（use-territory-description フック）
  ↓ イベント分類（useMemo）
UI コンポーネント（パネル、プロフィール、タイムライン）
```

### 5. テスト戦略

| レイヤー | ツール | テスト対象 |
|---------|--------|----------|
| データバリデーション | Vitest | Zod スキーマが "不明"、空文字列、不正データを拒否すること |
| イベント分類 | Vitest | `past`/`current`/`future` ロジックとエッジケース |
| プロフィールコンポーネント | Vitest + Testing Library | フィールド表示順序、空フィールドの省略 |
| タイムラインコンポーネント | Vitest + Testing Library | 視覚的状態、選択年マーカー、アクセシビリティ |
| パネル統合 | Vitest + Testing Library | デスクトップ vs モバイルレイアウト、データロード状態 |
| E2E | Playwright | 領土クリック → パネルに構造化情報が表示されること |
