# frontend: React アプリケーション

> Last updated: 2026-04-21T21:24:23+09:00

## 役割

React + MapLibre GL JS の SPA。任意の歴史年を選ぶとその年の世界地図を PMTiles で描画し、領土をクリックすると Notion 由来の概況・年表を読めるパネルが開く。
静的ホスティング（Cloudflare Pages）で配信する単一ページアプリで、地図タイルは dev 時は `public/` から、prod 時は Worker 経由で R2 から読む。

## 状態設計

```
 ┌────────────────────────────────────────────────┐
 │ AppStateProvider                               │
 │   state: selectedYear / selectedTerritory /    │
 │          isInfoPanelOpen / mapView             │
 │                                                │
 │   ┌──────────────────────────────────────────┐ │
 │   │ ProjectionProvider                       │ │
 │   │   projection: 'mercator' | 'globe'       │ │
 │   │                                          │ │
 │   │   AppContent  ──>  MapView, YearSelector,│ │
 │   │                    TerritoryInfoPanel …  │ │
 │   └──────────────────────────────────────────┘ │
 └────────────────────────────────────────────────┘

 MapView 内:
   useMapData(year)       → manifest / index / colorScheme / pmtilesUrl
   usePMTilesProtocol()   → maplibre に pmtiles:// を登録
   useProjection(ref)     → MapLibre.setProjection + flyTo 補助
   useMapHover/Keyboard   → 入力系の副作用
```

上層は React の Context が持つ UI 状態、中層はフェッチ結果を抱えるカスタム hook のローカル state、下層は MapLibre のインスタンス内部状態（投影・カメラ）。MapView は上層の `state.selectedYear` を見て下層のタイル読み込みを駆動する。

## Context と hooks

`AppStateContext` (`useAppState`) — `useReducer` ベースの UI 状態管理。アクションは `setSelectedYear` / `selectTerritory` / `clearSelection` / `setMapView`。`selectTerritory` は `isInfoPanelOpen` を自動で立てる。

`ProjectionContext` (`useProjectionContext`) — `mercator` / `globe` のトグルを保持するだけの軽量 Context。MapLibre との橋渡しは `useProjection` が担う。

主要カスタム hook:
- `useYearIndex` — `index.json` を 1 度だけ fetch し、YearSelector の年リストを返す
- `useMapData(year)` — manifest / year index / color scheme の 3 つを `Promise.all` で読み、当該年の `pmtilesUrl` を組み立てて返す
- `usePMTilesProtocol` — `maplibregl.addProtocol('pmtiles', …)` のライフサイクルを React の effect に寄せる
- `useProjection(mapRef)` — Context の `projection` 変化を MapLibre の `setProjection` + `flyTo` に同期。globe → mercator は flyTo 後に setProjection（ズームアウト時に投影を切り替える）、mercator → globe はその逆
- `useMapHover` — ホバー中のカーソル形状と cursor を切替
- `useMapKeyboard(mapRef)` — 矢印・`+`/`-` キーでパン・ズームを補助
- `useTerritoryDescription(name, year)` — `description-loader` を介して `descriptions/{year}.json` から 1 領土分を解決

`lib/cached-fetcher.ts` の `CachedFetcher` がこれらの「1 回だけ fetch」パターンを抽象化している — manifest / color scheme / 年ごとの説明 JSON、それぞれが単一インスタンスで保持される。

## MapLibre 統合

タイル URL の組み立ては `tiles-config.ts` に集約されている。`VITE_TILES_BASE_URL` 環境変数の有無で挙動が切り替わる:

- 未設定（dev） — `DEV_MANIFEST` を即返し、URL は `pmtiles:///pmtiles/world_{year}.pmtiles` 固定。`public/pmtiles/` に pipeline が書いた未ハッシュ化タイルを Vite がそのまま配信する
- 設定あり（prod） — `{baseUrl}/manifest.json` を fetch し、`manifest.files[year]` からハッシュ付きファイル名を取り、`pmtiles://{baseUrl}/{hashedName}` を返す

`MapView` は `useMapData` から得た `pmtilesUrl` を `<Source type="vector">` に渡し、PMTiles プロトコルが HTTP Range Request でスパース読み込みする。主要レイヤー:
- `TerritoryLayer` — source-layer `territories` の fill / outline。`color-scheme.json` を参照した `match` expression で SUBJECTO または NAME ごとに色分け
- `TerritoryHighlightLayer` — 選択中領土の強調。`state.selectedTerritory` に追従
- `TerritoryLabel` — source-layer `labels`（Point）の `name_ja` プロパティを `text-field` として描画。`filter: ['has', 'name_ja']` により日本語名が焼き込まれていない領土はラベルを出さない（英語フォールバックは行わない）

投影は Context 切替から `useProjection` が MapLibre の `setProjection` を叩く。globe 側は最大ズーム 2 に抑え、mercator 側は最低 3 を保証して UX の破綻を避ける。

## 主要フロー

年を選んだとき:
- YearSelector のボタンクリックまたは矢印キー操作で `actions.setSelectedYear(year)` が発火
- `AppState.selectedYear` が更新される
- `App` の `useEffect` が発火して `prefetchYearDescriptions(year)` が次年の説明バンドルをバックグラウンド取得
- `MapView` 内の `useMapData(year)` が再評価され、新しい `pmtilesUrl` が生成される
- MapLibre の `<Source>` が URL 差し替えを検知して新年のタイルを読み込む

領土をクリックしたとき:
- MapLibre の `onClick` で `interactiveLayerIds: [territory-fill]` のフィーチャが取れる
- `resolveTerritoryName(properties)` が `NAME || SUBJECTO` を返す
- `actions.selectTerritory(name)` で `selectedTerritory` と `isInfoPanelOpen` が立つ
- `TerritoryInfoPanel` が開き、中の `useTerritoryDescription(name, year)` が `descriptions/{year}.json` を（キャッシュ経由で）取り、kebab-case 化した名前でバンドルを引く
- `TerritoryHighlightLayer` が同じ名前を使って強調描画

投影法を切り替えたとき:
- ProjectionToggle が `setProjection(next)` を叩き、Context が更新
- `useProjection` が前回値と比較し、初回なら即 `setProjection`、以降は `flyTo` で滑らかにズームを調整してから切替
- globe 方向では `Math.min(currentZoom, 2)` までズームアウト、mercator 方向では `Math.max(currentZoom, 3)` までズームインしてから setProjection

領土説明の先読み:
- `App` が `selectedYear` 変化時に `prefetchYearDescriptions` を呼ぶ
- `CachedFetcher` が年別のシングルトンを持つため、領土クリック時には既にバンドルがメモリ上にあり即応する
- 404 の場合は null を返し、パネルは最小表示に落ちる
