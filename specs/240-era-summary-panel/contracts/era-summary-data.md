# Contract: era-summaries/{year}.json

**Feature**: 年代サマリーパネル
**Producer**: `apps/pipeline` の `era-summary-generate` サブコマンド
**Consumer**: `apps/frontend` の `domain/era-summary/load.ts`
**Storage**: `apps/frontend/public/data/era-summaries/{year}.json`（静的同梱）

## ファイル名規則

- `{year}` は年（整数）の文字列表現
- 紀元前は負号付き整数（例：`-100.json` は紀元前 100 年）
- 紀元 0 年は `0.json`
- ファイル 1 つ＝1 年のサマリー

例：
```
era-summaries/-2000.json
era-summaries/-1000.json
era-summaries/1000.json
era-summaries/1500.json
```

## 1. ルートオブジェクト

```jsonc
{
  "year": <number>,                  // 必須。整数。ファイル名と一致しなければならない
  "regions": [<RegionCard>, ...]     // 必須。1 件以上 8 件以下
}
```

**制約**:
- `year` は `historical-basemaps` 対応年集合の要素
- `regions` の長さは 1 以上 8 以下
- `regions` 内の `region` フィールドは重複禁止
- 配列の順序は表示順（先頭が最初に描画される）

## 2. `RegionCard`

```jsonc
{
  "region": <RegionId>,              // 必須。enum
  "title": <string>,                 // 必須。1〜30 文字
  "context": <string>,               // 必須。1〜500 文字
  "references": [<Reference>, ...]   // 任意。省略時は空配列扱い
}
```

### `RegionId` の enum

以下のいずれかの文字列：

```
"europe"
"east-asia"
"southeast-asia"
"south-asia"
"middle-east-north-africa"
"sub-saharan-africa"
"americas"
"oceania"
```

- 識別子は kebab-case 固定
- 表示見出しは `title` で指定する（識別子と表示文字列を分離）

### 制約

- `title.length`: 1〜30 文字
- `context.length`: 1〜500 文字（推奨：100〜300 文字）
- `context` は本文を直接書く。マークダウン構文は使わない（リンクは `references` で別途表現）
- 改行は許容するが多用しない

## 3. `Reference`

サマリー本文中から地図上の領土または別の年代へ遷移するための論理的な参照。

```jsonc
{
  "kind": "territory" | "year",      // 必須
  "target": <string>,                // 必須
  "text": <string>                   // 必須。本文中の表示文字列
}
```

### `kind` 別の制約

#### `kind === "territory"` の場合

- `target`: 領土の kebab-case 識別子（例：`"portugal"`、`"holy-roman-empire"`）
- `target` は対応する `descriptions/{year}.json` のキーに存在することが期待される（ランタイムで未解決の場合はリンク非表示にフォールバック）

#### `kind === "year"` の場合

- `target`: 年（整数）の文字列表現（例：`"1492"`、`"-100"`）
- `target` の年は `historical-basemaps` 対応年集合に存在する必要がある

### `text`

- 本文中の表示文字列。`context` の中にこの文字列が **1 度以上出現** することが必要
- フロントエンドはこの文字列を `context` 内で検索し、最初の出現箇所をリンク化する（実装は plan フェーズで詳細化）

## 4. JSON Schema 表現

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["year", "regions"],
  "additionalProperties": false,
  "properties": {
    "year": { "type": "integer" },
    "regions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 8,
      "items": {
        "type": "object",
        "required": ["region", "title", "context"],
        "additionalProperties": false,
        "properties": {
          "region": {
            "type": "string",
            "enum": [
              "europe",
              "east-asia",
              "southeast-asia",
              "south-asia",
              "middle-east-north-africa",
              "sub-saharan-africa",
              "americas",
              "oceania"
            ]
          },
          "title": { "type": "string", "minLength": 1, "maxLength": 30 },
          "context": { "type": "string", "minLength": 1, "maxLength": 500 },
          "references": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["kind", "target", "text"],
              "additionalProperties": false,
              "properties": {
                "kind": { "type": "string", "enum": ["territory", "year"] },
                "target": { "type": "string", "minLength": 1 },
                "text": { "type": "string", "minLength": 1 }
              }
            }
          }
        }
      }
    }
  }
}
```

## 5. サンプル：1500 年

```json
{
  "year": 1500,
  "regions": [
    {
      "region": "europe",
      "title": "ヨーロッパ",
      "context": "大航海時代の幕開け。ポルトガルとスペインがインド航路と新大陸到達を競い、イタリアではルネサンス文化が最盛期を迎える。",
      "references": [
        { "kind": "territory", "target": "portugal", "text": "ポルトガル" },
        { "kind": "territory", "target": "spain", "text": "スペイン" }
      ]
    },
    {
      "region": "east-asia",
      "title": "東アジア",
      "context": "明朝の成熟期。日本は応仁の乱後の戦国時代に突入し、朝鮮では儒教統治が揺らぐ。",
      "references": [
        { "kind": "territory", "target": "ming", "text": "明" }
      ]
    },
    {
      "region": "south-asia",
      "title": "南アジア",
      "context": "デリー・スルタン朝の末期。各地に地方勢力が台頭し、ムガル帝国成立前夜の混乱期にあたる。",
      "references": []
    },
    {
      "region": "middle-east-north-africa",
      "title": "中東・北アフリカ",
      "context": "オスマン帝国がバルカン・アナトリアを統合。サファヴィー朝が建国直前の混乱期。",
      "references": [
        { "kind": "territory", "target": "ottoman-empire", "text": "オスマン帝国" }
      ]
    },
    {
      "region": "sub-saharan-africa",
      "title": "サブサハラ・アフリカ",
      "context": "ソンガイ帝国がサヘル交易を支配。コンゴ王国がポルトガルと接触を開始し、大西洋世界との関係が始まる。",
      "references": []
    },
    {
      "region": "americas",
      "title": "南北アメリカ",
      "context": "インカ帝国が最大版図、アステカ帝国が中央メキシコを支配。ヨーロッパ人到達前夜。",
      "references": [
        { "kind": "territory", "target": "inca-empire", "text": "インカ帝国" }
      ]
    }
  ]
}
```

## 6. バージョニング

このスキーマは **v1**。将来スキーマを変更する場合は：

- 後方互換変更（フィールド追加で `additionalProperties: false` を緩和）：マイナーバージョン上げ + コードで欠落許容
- 破壊的変更：ルートに `"schemaVersion": 2` を追加し、Reader 側で分岐
