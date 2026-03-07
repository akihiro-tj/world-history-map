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
| `dynasty` | rich_text | いいえ | 王朝（領土名 ≈ 王朝名の場合は省略） |
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

重要: territory_id は対象年の GeoJSON に存在する NAME と一致しなければならない。`apps/frontend/public/pmtiles/index.json` で検証すること。

## Notion MCP の使い方

`mcp__notion__notion-create-pages` でページを作成する:

```json
{
  "pages": [
    {
      "database_id": "<DB_ID>",
      "properties": {
        "name": { "title": [{ "text": { "content": "フランス王国" } }] },
        "territory_id": { "rich_text": [{ "text": { "content": "france" } }] },
        "year": { "number": 1700 },
        "era": { "rich_text": [{ "text": { "content": "絶対王政期" } }] },
        "capital": { "rich_text": [{ "text": { "content": "パリ" } }] },
        "regime": { "rich_text": [{ "text": { "content": "絶対王政" } }] },
        "dynasty": { "rich_text": [{ "text": { "content": "ブルボン朝" } }] },
        "leader": { "rich_text": [{ "text": { "content": "ルイ14世" } }] },
        "religion": { "rich_text": [{ "text": { "content": "カトリック" } }] },
        "context": { "rich_text": [{ "text": { "content": "1700年のフランスは..." } }] },
        "key_events": { "rich_text": [{ "text": { "content": "1643:ルイ14世即位|1661:ルイ14世の親政開始|1682:ヴェルサイユ宮殿に宮廷を移転|1789:フランス革命" } }] }
      }
    }
  ]
}
```

データがないオプションプロパティはプロパティごと省略する — 空文字列や "不明" を設定してはならない。
