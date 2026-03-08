# データモデル: 領土情報パネル リデザイン

**ブランチ**: `004-territory-info-redesign` | **日付**: 2026-03-01

## エンティティ関係図

```
YearDescriptionBundle (ファイル: {year}.json)
  └── Record<string, TerritoryDescription>
        ├── name: string
        ├── era?: string
        ├── profile?: TerritoryProfile
        │     ├── capital?: string
        │     ├── regime?: string
        │     ├── dynasty?: string
        │     ├── leader?: string
        │     └── religion?: string
        ├── context?: string
        └── keyEvents?: KeyEvent[]
              ├── year: number
              └── event: string
```

## コアエンティティ

### TerritoryDescription

特定の年における領土の情報を表す。年ファイルごとに領土あたり 1 エントリ。

| フィールド | 型 | 必須 | 制約 |
|-----------|------|------|------|
| `name` | `string` | はい | 日本語の表示名。非空、"不明" 禁止 |
| `era` | `string` | いいえ | 短い歴史的時代ラベル（例: "絶対王政期"）。不明なら省略 |
| `profile` | `TerritoryProfile` | いいえ | 構造化プロフィール。既知のフィールドがなければ省略 |
| `context` | `string` | いいえ | 客観的事実による 2〜3 文（100〜200 字）。データなしなら省略 |
| `keyEvents` | `KeyEvent[]` | いいえ | 年の昇順でソート。イベントなしなら省略（空配列は使わない） |

**削除したフィールド**（現行モデルとの比較）:
- `id`: 冗長。バンドルキー（kebab-case 領土名）+ ファイル名（年）が識別子として機能
- `year`: 冗長。JSON ファイル名から導出可能
- `facts`: 構造化された `profile` に置き換え
- `aiGenerated`: 削除。UI は `<AiNotice>` コンポーネントで無条件に AI 生成の注意書きを表示

### TerritoryProfile

非構造化の `facts: string[]` を置き換える構造化キー・バリューペア。フィールドは固定の表示順序で表示。

| フィールド | 型 | 必須 | 表示順序 | 例 |
|-----------|------|------|---------|-----|
| `capital` | `string` | いいえ | 1 | "パリ" |
| `regime` | `string` | いいえ | 2 | "絶対王政" |
| `dynasty` | `string` | いいえ | 3 | "ブルボン朝" |
| `leader` | `string` | いいえ | 4 | "ルイ14世" |
| `religion` | `string` | いいえ | 5 | "カトリック" |

**不変条件**:
- すべてのフィールドが undefined の場合、`profile` オブジェクト自体を省略
- どのフィールドも "不明" を含んではならない -- 代わりにフィールドを省略
- 値は自由形式の日本語テキスト（enum ではない）

### KeyEvent

領土のタイムライン上の重要な歴史的イベント。

| フィールド | 型 | 必須 | 制約 |
|-----------|------|------|------|
| `year` | `number` | はい | 整数。紀元前は負数 |
| `event` | `string` | はい | 日本語の説明。非空、"不明" 禁止 |

**時間的分類**（表示時のみ、データには保存しない）:
- `past`（過去）: `event.year < selectedYear`
- `current`（現在）: `event.year === selectedYear`（完全一致のみ）
- `future`（未来）: `event.year > selectedYear`

### ClassifiedKeyEvent（表示時に導出）

`KeyEvent` を時間的分類で拡張したもの。UI レイヤーで算出し、永続化しない。

| フィールド | 型 | ソース |
|-----------|------|--------|
| `year` | `number` | `KeyEvent` から |
| `event` | `string` | `KeyEvent` から |
| `temporal` | `"past" \| "current" \| "future"` | `selectedYear` から算出 |

### YearDescriptionBundle

各 `{year}.json` ファイルのトップレベル構造。

| 型 | キー | 値 |
|------|-----|------|
| `Record<string, TerritoryDescription>` | kebab-case 領土 ID（例: `"france"`, `"tokugawa-shogunate"`） | 領土の説明 |

## ファイル構造

```
public/data/descriptions/
├── -500.json      # 紀元前500年
├── -200.json      # 紀元前200年
├── 100.json
├── 600.json
├── 1000.json
├── 1200.json
├── 1300.json
├── ...
├── 1700.json
├── 1900.json
└── 2000.json
```

各ファイルには 10〜30 の領土エントリが含まれる（総計 50〜70 領土のうち、その年に存在していた領土のサブセット）。

## データ例

### 1700.json（抜粋）

```json
{
  "france": {
    "name": "フランス王国",
    "era": "絶対王政期",
    "profile": {
      "capital": "パリ",
      "regime": "絶対王政",
      "dynasty": "ブルボン朝",
      "leader": "ルイ14世",
      "religion": "カトリック"
    },
    "context": "1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。",
    "keyEvents": [
      { "year": 1643, "event": "ルイ14世即位" },
      { "year": 1661, "event": "ルイ14世の親政開始" },
      { "year": 1682, "event": "ヴェルサイユ宮殿に宮廷を移転" },
      { "year": 1789, "event": "フランス革命" }
    ]
  },
  "tokugawa-shogunate": {
    "name": "江戸幕府",
    "era": "元禄期",
    "profile": {
      "capital": "江戸",
      "regime": "幕藩体制",
      "leader": "徳川綱吉"
    },
    "context": "1700年は5代将軍徳川綱吉の治世であり、元禄文化が花開いた時代である。鎖国体制のもと長崎出島のみが対外窓口として機能していた。",
    "keyEvents": [
      { "year": 1603, "event": "徳川家康が征夷大将軍に就任" },
      { "year": 1639, "event": "鎖国の完成" },
      { "year": 1868, "event": "大政奉還" }
    ]
  }
}
```

### 最小限のエントリ（データが少ない領土）

```json
{
  "ethiopia": {
    "name": "エチオピア帝国",
    "profile": {
      "capital": "ゴンダール"
    }
  }
}
```

`era`, `context`, `keyEvents`, その他のプロフィールフィールドはすべて省略。"不明" ではなく、フィールド自体がない。

## バリデーションルール

データ同期時（パイプライン）および CI で適用:

| ルール | 対象 | エラーメッセージ |
|--------|------|---------------|
| "不明" 値の禁止 | すべての文字列フィールド | `{territory} の {year} 年 {field} に "不明" が含まれています` |
| 非空文字列 | すべての存在する文字列フィールド | `{territory} の {year} 年 {field} が空文字列です` |
| 文脈の長さ | `context` フィールド | `{territory} の {year} 年の context が {len} 文字です（期待値: 50-200）` |
| イベントのソート | `keyEvents` 配列 | `{territory} の {year} 年の events が年順にソートされていません` |
| 空プロフィール禁止 | `profile` オブジェクト | `{territory} の {year} 年に空の profile があります（省略すべき）` |
| 空 keyEvents 禁止 | `keyEvents` 配列 | `{territory} の {year} 年に空の keyEvents があります（省略すべき）` |
| name 必須 | `name` フィールド | `{territory} の {year} 年に name がありません` |
| イベント年は整数 | `keyEvents[].year` | `{territory} の {year} 年のイベント年が整数ではありません` |

## 移行に関する注記

- これは**マイグレーションではなく完全な再作成**。`public/data/descriptions/` の既存ファイルはすべて削除する
- `use-territory-description.ts` の `toKebabCase()` 関数は新しいデータファイルのバンドルキーと一致する必要がある
- 領土キーは GeoJSON フィーチャの `NAME` プロパティを kebab-case 変換した結果と一致する必要がある
