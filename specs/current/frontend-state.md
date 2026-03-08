# フロントエンド状態設計

> Last synced: 2026-03-08

## 概要

フロントエンドの状態管理は 3 層に分かれる: AppStateContext（グローバル共有状態）、ローカル hooks（コンポーネント固有状態）、MapLibre 内部状態（地図エンジン管理）。URL パラメータは未使用。

## 状態の流れ

```mermaid
graph TD
    subgraph AppStateContext["AppStateContext (useReducer)"]
        selectedYear[selectedYear: number]
        selectedTerritory["selectedTerritory: string #124; null"]
        isInfoPanelOpen[isInfoPanelOpen: boolean]
        mapView[mapView: MapViewState]
        isLoading[isLoading: boolean]
        error["error: string #124; null"]
    end

    subgraph LocalHooks["ローカル hooks"]
        useMapData["useMapData → pmtilesUrl, yearIndex"]
        useProjection["useProjection → projection"]
        useMapHover["useMapHover → isHoveringTerritory"]
        useYearIndex["useYearIndex → years[]"]
        useTerritoryDesc["useTerritoryDescription → description"]
        useIsMobile["useIsMobile → boolean"]
    end

    subgraph MapLibre["MapLibre 内部状態"]
        viewport["viewport (pan/zoom/bearing)"]
        layers["layers & sources"]
        glProjection["globe/mercator projection"]
    end

    selectedYear --> useMapData
    selectedYear --> useTerritoryDesc
    selectedTerritory --> useTerritoryDesc
    useMapData -->|pmtilesUrl| layers
    useProjection -->|setProjection| glProjection
    isInfoPanelOpen --> TerritoryInfoPanel
    useTerritoryDesc --> TerritoryInfoPanel
    useYearIndex --> YearSelector
    selectedYear --> YearSelector
```

## 主要ユーザー操作フロー

```mermaid
sequenceDiagram
    participant U as User
    participant YS as YearSelector
    participant Ctx as AppStateContext
    participant MD as useMapData
    participant Map as MapLibre

    U->>YS: 年代をクリック
    YS->>Ctx: setSelectedYear(year)
    Ctx-->>MD: selectedYear 変更
    MD->>MD: fetchYearBundle → pmtilesUrl 算出
    MD-->>Map: 新しい PMTiles ソース設定

    U->>Map: 領土をクリック
    Map->>Ctx: setSelectedTerritory(name)
    Map->>Ctx: setInfoPanelOpen(true)
    Ctx-->>TerritoryInfoPanel: 表示 + description fetch
```

## 境界と同期ポイント

| 境界 | 方向 | 仕組み |
|------|------|--------|
| AppStateContext ↔ MapView | 双方向 | Context の selectedYear が useMapData を駆動。地図クリックが Context を更新 |
| AppStateContext ↔ TerritoryInfoPanel | 単方向 | Context の selectedTerritory + selectedYear → useTerritoryDescription で JSON fetch |
| useProjection ↔ MapLibre | 単方向 | hook が mapRef 経由で setProjection / flyTo を直接呼び出し |
| useTerritoryDescription ↔ ネットワーク | 単方向 | モジュールレベル Map キャッシュ + prefetch (`/data/descriptions/{year}.json`) |
| useIsMobile ↔ TerritoryInfoPanel | 単方向 | matchMedia でレスポンシブ分岐（BottomSheet vs サイドパネル） |
