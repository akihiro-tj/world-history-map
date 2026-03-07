---
name: notion-territory-data
description: >
  Notion データベースに世界史の領土データを投入・更新するためのスキル。
  Notion DB プロパティスキーマ、データ品質ガイドライン、領土選定基準、
  Notion MCP の呼び出しフォーマットを提供する。
  トリガー: "Notion DB にデータを投入", "領土データ作成", "領土データをNotionに登録",
  "populate Notion", "create territory data", "sync-descriptions"
---

# Notion 領土データ投入ガイド

Notion データベースに構造化された世界史領土データを投入する。

## ワークフロー

### 1. データベース ID の取得

```bash
op read "op://dev/world-history-map-pipeline/territory-descriptions-database-id"
```

取得した ID をすべての `mcp__notion__notion-create-pages` 呼び出しで使用する。

### 2. 投入計画の作成とユーザー承認

データ作成の前に、投入対象の年度と領土の一覧をユーザーに提示して承認を得る。

1. [territory-selection.md](references/territory-selection.md) の推奨リストを参考に、対象領土と年度を選定する
2. GeoJSON で各領土の存在を検証する（ステップ 3 参照）
3. 年度 × 領土のマトリクスをユーザーに提示する（例: 表形式）
4. ユーザーの承認を得てから投入を開始する

### 3. GeoJSON 領土名の検証

対象年の GeoJSON に領土名が存在することを確認する:

```bash
# 例: 1700年のオスマン帝国を検索
jq '.years[] | select(.year == 1700) | .countries[]' apps/frontend/public/pmtiles/index.json | grep -i "ottoman"
```

`territory_id` は GeoJSON の NAME を kebab-case 変換した値と一致しなければならない:
`name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`

### 4. エージェントによるバッチ投入

大量のデータ投入はコンテキストウィンドウを圧迫するため、Agent ツールを活用する。

**バッチ戦略**: 地域バッチ単位（東アジア、中東、ヨーロッパ等）でエージェントに投入を委譲する。

各エージェントへのプロンプトには以下を含める:
- Notion データベース ID
- 投入対象の領土リスト（GeoJSON NAME、territory_id、日本語名、対象年）
- [notion-schema.md](references/notion-schema.md) の MCP 呼び出しフォーマット
- [data-quality.md](references/data-quality.md) の品質ルール

エージェントは `mcp__notion__notion-create-pages` で Notion にページを作成する。

### 5. 品質ルール

- すべてのコンテンツを日本語で記述する
- "不明" は絶対に使用しない — 不明なフィールドは省略する
- `context`: 50〜200 字、客観的事実のみ、選択年に固有の記述
- `key_events`: パイプ区切り（`年:イベント|年:イベント`）、3 件以上、昇順ソート
- `dynasty`: 領土名 ≈ 王朝名の場合は省略する

詳細な執筆ガイドラインは [data-quality.md](references/data-quality.md) を参照。

### 6. 投入後のバリデーション

Notion データの人的レビュー完了後:

```bash
pnpm pipeline sync-descriptions
pnpm pipeline validate-descriptions
```

## リファレンスファイル

- [notion-schema.md](references/notion-schema.md) — Notion DB プロパティ定義、MCP 呼び出しフォーマット
- [data-quality.md](references/data-quality.md) — コンテンツ執筆ガイドライン、バリデーションルール
- [territory-selection.md](references/territory-selection.md) — 領土リスト、選定基準、バッチ戦略
