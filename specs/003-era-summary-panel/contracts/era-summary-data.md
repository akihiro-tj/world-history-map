# Contract: Era Summary Data

**Feature**: 年代サマリーパネル

データは Notion DB（一次ソース）→ Pipeline（変換）→ Frontend（消費）の単方向で流れる。本 contract は **Notion DB スキーマ** と **JSON 出力スキーマ** の両方を定義する。

| 役割 | 担当 |
|------|------|
| **Producer (一次)** | Notion DB "Era Summary"（人間がコンテンツを編集） |
| **Producer (二次／変換)** | `apps/pipeline` の `era-summary-sync` サブコマンド（`stages/sync-era-summaries.ts`） |
| **Consumer** | `apps/frontend` の `domain/era-summary/load.ts` |
| **Storage** | `apps/frontend/public/data/era-summaries/{year}.json`（静的同梱） |

## Notion DB スキーマ

Notion 上の "Era Summary" データベース。**1 ページ ＝ 1 年・1 地域** のレコード。

| プロパティ名 | Notion 型 | 必須 | 説明 |
|------------|---------|----|------|
| `Year` | Number（整数） | ✓ | 対象年。負号で紀元前を表す（例：`-100` ＝ BC 100） |
| `Region` | Select（enum） | ✓ | 地域識別子。下記 enum のいずれか |
| `Title` | Title（テキスト） | ✓ | 表示見出し（1〜30 文字、例：「ヨーロッパ」） |
| `Context` | Rich text | ✓ | 概況本文（1〜500 文字、推奨 100〜300 文字）。改行可、マークダウン構文は使わない |
| `References` | Rich text | 任意 | リンク参照を JSON 配列の文字列として格納。空または未入力は空配列扱い |

### `Region` の Select オプション

```
europe
east-asia
southeast-asia
south-asia
middle-east-north-africa
sub-saharan-africa
americas
oceania
```

kebab-case 固定。Notion 上の Select オプション名は識別子そのまま。表示用の見出しは `Title` プロパティで別途管理（識別子と表示文字列を分離）。

### `References` の JSON 文字列フォーマット

Notion の Rich text に以下の JSON 配列を文字列として記入する：

```json
[
  { "kind": "territory", "target": "portugal", "text": "ポルトガル" },
  { "kind": "year", "target": "1492", "text": "1492 年" }
]
```

- `kind`：`"territory"` または `"year"` のいずれか
- `target`：`kind === "territory"` なら kebab-case 領土 ID（既存 `descriptions/{year}.json` のキー集合に存在することが期待される）、`kind === "year"` なら年（整数の文字列表現）
- `text`：`Context` 本文中の表示文字列。Pipeline はこの文字列を `Context` 内で検索し、最初の出現箇所をリンク化対象としてマークアップする

空または未入力の場合は空配列 `[]` 扱い。Pipeline 側でパース失敗時は当該レコードのみエラーとしてログ出力し、`references = []` でフォールバック。

### 同年×同地域の重複禁止

Notion DB 内で `Year + Region` の組み合わせは一意。重複ページは Pipeline で検出してエラー。

## ファイル名規則（JSON 出力）

Pipeline は Notion DB の全ページを取得し、**`Year` でグループ化** して 1 年 1 ファイルにまとめる。

- `{year}` は年（整数）の文字列表現
- 紀元前は負号付き整数（例：`-100.json` は紀元前 100 年）
- 紀元 0 年は `0.json`
- ファイル 1 つ＝1 年のサマリー（複数の地域カードを内包）

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

## 5. サンプル：1650 年（本 plan の代表データ）

本 plan のスコープでは **1650 年** を Notion DB に投入し、動作確認の代表データとする。1650 年はアプリのデフォルト表示年であり、初回アクセス時の体験を担保するため最初のターゲット。

```json
{
  "year": 1650,
  "regions": [
    {
      "region": "europe",
      "title": "ヨーロッパ",
      "context": "三十年戦争が終結（1648 年ウェストファリア条約）し、主権国家体制が成立。フランスでは絶対王政が確立しつつあり、イングランドは内戦からピューリタン革命の只中。",
      "references": [
        { "kind": "year", "target": "1648", "text": "1648 年" },
        { "kind": "territory", "target": "france", "text": "フランス" }
      ]
    },
    {
      "region": "east-asia",
      "title": "東アジア",
      "context": "明朝が李自成の乱と清軍の南下により滅亡（1644 年）、清が中国本土を支配。日本では江戸幕府が鎖国体制を確立。",
      "references": [
        { "kind": "territory", "target": "qing", "text": "清" },
        { "kind": "territory", "target": "japan", "text": "日本" }
      ]
    },
    {
      "region": "south-asia",
      "title": "南アジア",
      "context": "ムガル帝国がシャー・ジャハーンの治世下で最盛期を迎える。タージマハル建造の時代。",
      "references": [
        { "kind": "territory", "target": "mughal-empire", "text": "ムガル帝国" }
      ]
    },
    {
      "region": "middle-east-north-africa",
      "title": "中東・北アフリカ",
      "context": "オスマン帝国は最盛期を過ぎ停滞期に入る。サファヴィー朝はアッバース 2 世の治世で文化的繁栄を維持。",
      "references": [
        { "kind": "territory", "target": "ottoman-empire", "text": "オスマン帝国" }
      ]
    },
    {
      "region": "sub-saharan-africa",
      "title": "サブサハラ・アフリカ",
      "context": "大西洋奴隷貿易が本格化。コンゴ王国・ベニン王国などがヨーロッパ諸国との交易・抗争に関わる。",
      "references": []
    },
    {
      "region": "americas",
      "title": "南北アメリカ",
      "context": "スペイン領植民地（ヌエバ・エスパーニャ／ペルー副王領）が銀の採掘で世界経済を支える。北米東岸ではイギリス植民地（バージニア・ニューイングランド）が拡大。",
      "references": []
    }
  ]
}
```

## 6. バージョニング

このスキーマは **v1**。将来スキーマを変更する場合は：

- 後方互換変更（フィールド追加で `additionalProperties: false` を緩和）：マイナーバージョン上げ + コードで欠落許容
- 破壊的変更：ルートに `"schemaVersion": 2` を追加し、Reader 側で分岐
