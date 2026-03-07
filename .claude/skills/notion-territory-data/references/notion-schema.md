# Notion DB プロパティスキーマ

## プロパティ一覧

| プロパティ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | title | はい | 日本語の表示名（例: "フランス王国"） |
| `territory_id` | rich_text | はい | GeoJSON NAME と一致する kebab-case ID（例: "france"） |
| `year` | number | はい | 歴史的な年（整数、紀元前は負数） |
| `era` | rich_text | いいえ | 短い時代ラベル（例: "絶対王政期"） |
| `capital` | rich_text | いいえ | 首都 |
| `regime` | rich_text | いいえ | 政体 |
| `dynasty` | rich_text | いいえ | 王朝（領土名 = 王朝名の場合は省略） |
| `leader` | rich_text | いいえ | 指導者 |
| `religion` | rich_text | いいえ | 宗教 |
| `context` | rich_text | いいえ | 客観的事実による 2〜3 文（50〜200 字） |
| `key_events` | rich_text | いいえ | パイプ区切り形式: `年:イベント\|年:イベント` |

## key_events のフォーマット

```
1643:ルイ14世即位|1661:ルイ14世の親政開始|1682:ヴェルサイユ宮殿に宮廷を移転|1789:フランス革命
```

- 区切り文字: `|`（パイプ）でイベント間を区切る
- セパレータ: `:`（コロン）で年と説明を区切る（最初のコロンのみ）
- イベントは年の昇順でソートしなければならない
- 1 領土あたり最低 3 件のイベント

## territory_id のルール

GeoJSON の NAME プロパティから `toKebabCase()` で生成:

```
name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
```

例:
- `Ottoman Empire` → `ottoman-empire`
- `Tokugawa Shogunate` → `tokugawa-shogunate`
- `Aragón` → `aragn`（特殊文字は除去）
- `Mughal Empire` → `mughal-empire`

## CSV フォーマット

Notion にインポートするための CSV 形式。RFC 4180 準拠。

### ヘッダー行

```csv
name,territory_id,year,era,capital,regime,dynasty,leader,religion,context,key_events
```

### データ行の例

```csv
フランス王国,france,1700,絶対王政期,パリ,絶対王政,ブルボン朝,ルイ14世,カトリック,"1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。","1643:ルイ14世即位|1661:ルイ14世の親政開始|1682:ヴェルサイユ宮殿に宮廷を移転|1789:フランス革命"
```

### CSV ルール

- エンコーディング: UTF-8（BOM なし）
- 改行: LF
- フィールドにカンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
- ダブルクォート内のダブルクォートは `""` でエスケープする
- データがないオプションフィールドは空セル（`,,`）にする — "不明" は使用しない
- `name`, `territory_id`, `year` は必須。空にしてはならない

### データスパースな領土の例

```csv
エチオピア帝国,ethiopia,1700,,ゴンダール,,,,,,"1270:ソロモン朝復興|1632:ファシリデス即位・ゴンダール遷都|1769:ゼメネ・メサフント（諸侯時代）開始"
```

era, regime, dynasty, leader, religion, context が空セルになっている。
