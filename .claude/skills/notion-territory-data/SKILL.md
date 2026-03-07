---
name: notion-territory-data
description: >
  Notion データベースにインポートする世界史領土データの CSV を生成するスキル。
  Notion DB プロパティスキーマ、データ品質ガイドライン、領土選定基準、
  CSV フォーマットを提供する。
  トリガー: "Notion DB にデータを投入", "領土データ作成", "領土データをNotionに登録",
  "populate Notion", "create territory data", "sync-descriptions"
---

# Notion 領土データ CSV 生成ガイド

Notion データベースにインポートするための CSV ファイルを生成する。

## ワークフロー

### 1. Notion DB の既存データ確認

Notion MCP を使って既存エントリを取得する。

1. 1Password CLI でデータベース ID を取得し、`notion-fetch` で直接アクセスする:
   ```bash
   op read "op://dev/world-history-map-pipeline/territory-descriptions-database-id"
   ```
   取得した ID を `notion-fetch` の URL に使用: `https://www.notion.so/database/<ID>`
2. 既存エントリの `territory_id` × `year` の組み合わせを一覧化する

### 2. 優先度順の投入計画とユーザー承認

既存データと GeoJSON の領土一覧を突き合わせ、次に作成すべき領土をユーザーと相談する。

1. `apps/frontend/public/pmtiles/index.json` から全年・全領土の一覧を取得する
2. ステップ 1 で取得した既存エントリ（`territory_id` × `year`）を除外し、未作成の候補を抽出する
3. [territory-selection.md](references/territory-selection.md) の優先度定義・除外カテゴリを参考に、候補を優先度（P1 → P2 → P3 → P4）順、同優先度内は時代順にソートする
4. 優先度別の候補件数サマリをユーザーに提示する（例: P1: 12 件、P2: 28 件…）
5. 作成件数をユーザーに選択肢で提案する（AskUserQuestion を使用）:
   - 選択肢例: 「P1 のみ（N 件）」「P1 + P2（N 件）」「指定件数」「全部」
6. 年度 x 領土のマトリクスをユーザーに提示して承認を得る

### 3. エージェントによるバッチ CSV 生成

大量のデータ生成はコンテキストウィンドウを圧迫するため、Agent ツールを活用する。

**バッチ戦略**: 地域バッチ単位（東アジア、中東、ヨーロッパ等）でエージェントにデータ生成を委譲する。

各エージェントへのプロンプトには以下を含める:
- 投入対象の領土リスト（GeoJSON NAME、territory_id、日本語名、対象年）
- [data-quality.md](references/data-quality.md) の品質ルール
- [notion-schema.md](references/notion-schema.md) の DB スキーマ・CSV フォーマット・territory_id 変換ルール
- 出力先ファイルパス: `.cache/notion-batch-<region>.csv`

エージェントは `.cache/notion-batch-<region>.csv` にデータを書き出し、ファイルパスと件数サマリのみを返す。

### 4. メインコンテキストでの CSV 統合

エージェントが生成した CSV ファイルを統合して 1 つの CSV にまとめる。

```bash
head -1 .cache/notion-batch-east-asia.csv > .cache/notion-territory-data.csv
for f in .cache/notion-batch-*.csv; do tail -n +2 "$f" >> .cache/notion-territory-data.csv; done
```

統合後、件数と地域バランスをユーザーに報告する。

### 5. ユーザーによる Notion インポート

統合 CSV ファイルをユーザーに渡し、Notion UI からインポートしてもらう。

**手順**:
1. Notion で対象データベースを開く
2. 右上の `...` メニュー → 「Merge with CSV」を選択
3. `.cache/notion-territory-data.csv` をアップロード
4. カラムマッピングを確認して実行

### 6. 投入後のバリデーション

Notion データの人的レビュー完了後:

```bash
pnpm pipeline sync-descriptions
pnpm pipeline validate-descriptions
```

## リファレンスファイル

- [notion-schema.md](references/notion-schema.md) — DB スキーマ、territory_id 変換ルール、CSV フォーマット
- [data-quality.md](references/data-quality.md) — コンテンツ執筆ガイドライン、バリデーションルール
- [territory-selection.md](references/territory-selection.md) — 優先度定義、選定基準、除外カテゴリ
