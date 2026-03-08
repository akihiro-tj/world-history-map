# データモデル

> Last synced: 2026-03-08

## 概要

世界史地図アプリのドメインモデル。Territory（勢力圏）と Year（年代）を中核とし、pipeline → frontend 間で同一形状の型が独立定義されている。

## 型の関連と変換チェーン

```mermaid
graph TD
    subgraph "Notion DB"
        NP[Notion Page<br/>territory_id, year, name, era,<br/>profile fields, context, key_events]
    end

    subgraph "Pipeline (apps/pipeline)"
        TE[TransformedEntry<br/>year + territoryId + TerritoryDescription]
        YB[YearBundle<br/>year + Record&lt;id, TerritoryDescription&gt;]
        GJ[GeoJSON Feature<br/>properties: NAME, SUBJECTO]
        VS[YearState<br/>source → merge → validate → convert → prepare → upload]
    end

    subgraph "Runtime JSON (public/data/)"
        DJ["descriptions/{year}.json<br/>Record&lt;id, TerritoryDescription&gt;"]
        CS["color-scheme.json<br/>Record&lt;NAME, hsl()&gt;"]
        YI["year-index.json<br/>YearIndex { years: YearEntry[] }"]
    end

    subgraph "Frontend (apps/frontend)"
        FTD[TerritoryDescription<br/>name, era?, profile?, context?, keyEvents?]
        FTP[TerritoryProperties<br/>NAME, SUBJECTO]
        FYE[YearEntry<br/>year, filename, countries]
        AS[AppState<br/>selectedYear, selectedTerritory, mapView...]
    end

    NP -->|sync-descriptions| TE
    TE -->|group by year| YB
    YB -->|write JSON| DJ
    GJ -->|tippecanoe| PMT[PMTiles]

    DJ -->|fetch| FTD
    CS -->|fetch| FE_COLOR[fill-color expression]
    YI -->|fetch| FYE
    PMT -->|MapLibre source| FTP
```

## 中核型定義

### TerritoryDescription（frontend / pipeline 両方に同一形状で存在）

```typescript
interface TerritoryDescription {
  name: string;
  era?: string;
  profile?: TerritoryProfile;
  context?: string;
  keyEvents?: KeyEvent[];
}

interface TerritoryProfile {
  capital?: string;
  regime?: string;
  dynasty?: string;
  leader?: string;
  religion?: string;
}

interface KeyEvent {
  year: number;
  event: string;
}
```

### TerritoryProperties（GeoJSON / PMTiles レイヤーの属性）

```typescript
interface TerritoryProperties {
  NAME: string;
  SUBJECTO: string;
}
```

### YearEntry（frontend / pipeline 同一定義）

```typescript
interface YearEntry {
  year: number;
  filename: string;
  countries: string[];
}
```

## 境界と変換ポイント

| 境界 | 変換元 | 変換先 | 方法 |
|------|--------|--------|------|
| Notion → Pipeline | Notion Page properties | TransformedEntry | `@notionhq/client` API |
| Pipeline → JSON | YearBundle | `descriptions/{year}.json` | `writeFileSync` |
| Pipeline → PMTiles | GeoJSON FeatureCollection | `.pmtiles` | tippecanoe CLI |
| JSON → Frontend | `descriptions/{year}.json` | `YearDescriptionBundle` | `fetch` + JSON parse |
| PMTiles → Frontend | PMTiles vector tile | `TerritoryProperties` | MapLibre GL JS source |

## 型の重複

`TerritoryDescription` 系と `YearEntry` は pipeline / frontend 間で共有パッケージを持たず、各アプリに独立定義されている。JSON ファイルがスキーマの事実上の契約として機能し、pipeline 側は Zod スキーマ（`validate-descriptions.ts`）でバリデーションしている。
