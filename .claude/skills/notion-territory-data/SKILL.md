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

### 1. 投入計画の作成とユーザー承認

データ作成の前に、投入対象の年度と領土の一覧をユーザーに提示して承認を得る。

1. [territory-selection.md](references/territory-selection.md) の推奨リストを参考に、対象領土と年度を選定する
2. GeoJSON で各領土の存在を検証する（ステップ 2 参照）
3. 年度 x 領土のマトリクスをユーザーに提示する（例: 表形式）
4. ユーザーの承認を得てから生成を開始する

### 2. GeoJSON 領土名の検証

対象年の GeoJSON に領土名が存在することを確認する:

```bash
jq '.years[] | select(.year == 1700) | .countries[]' apps/frontend/public/pmtiles/index.json | grep -i "ottoman"
```

`territory_id` は GeoJSON の NAME を kebab-case 変換した値と一致しなければならない:
`name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`

### 3. エージェントによるバッチ CSV 生成

大量のデータ生成はコンテキストウィンドウを圧迫するため、Agent ツールを活用する。

**バッチ戦略**: 地域バッチ単位（東アジア、中東、ヨーロッパ等）でエージェントにデータ生成を委譲する。

各エージェントへのプロンプトには以下を含める:
- 投入対象の領土リスト（GeoJSON NAME、territory_id、日本語名、対象年）
- [data-quality.md](references/data-quality.md) の品質ルール
- 出力先ファイルパス: `.cache/notion-batch-<region>.csv`
- 出力フォーマット: [notion-schema.md](references/notion-schema.md) の CSV フォーマット（ヘッダー行あり）

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

### 6. 品質ルール

- すべてのコンテンツを日本語で記述する
- "不明" は絶対に使用しない — 不明なフィールドは省略する（CSV では空セルにする）
- `context`: 50〜200 字、客観的事実のみ、選択年に固有の記述
- `key_events`: パイプ区切り（`年:イベント|年:イベント`）、3 件以上、昇順ソート
- `dynasty`: 領土名 = 王朝名の場合は省略する

詳細な執筆ガイドラインは [data-quality.md](references/data-quality.md) を参照。

### 7. 投入後のバリデーション

Notion データの人的レビュー完了後:

```bash
pnpm pipeline sync-descriptions
pnpm pipeline validate-descriptions
```

## リファレンスファイル

- [notion-schema.md](references/notion-schema.md) — Notion DB プロパティ定義、CSV フォーマット
- [data-quality.md](references/data-quality.md) — コンテンツ執筆ガイドライン、バリデーションルール
- [territory-selection.md](references/territory-selection.md) — 領土リスト、選定基準、バッチ戦略
