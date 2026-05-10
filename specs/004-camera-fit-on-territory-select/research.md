# Research: Camera Fit on Territory Select

**Feature**: 004-camera-fit-on-territory-select  
**Date**: 2026-05-10  
**Linked plan**: [plan.md](./plan.md)

本ドキュメントは plan.md の Phase 0 で挙げた 8 件のリサーチトピックに対する決定（Decision）と根拠（Rationale）、検討した代替案（Alternatives considered）を集約する。

---

## R1. bbox 生成の責任分担（飛び地問題への対応）

**Decision**:
`apps/pipeline/src/tiles/merge.ts` の `mergeByName()` を拡張し、既に検出している **最大面積ポリゴン**（`largestPoly`）に `turf.bbox()` を適用して `[west, south, east, north]` を取得し、Feature.properties に格納する。プロパティ名は `BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` の数値 4 個に分け、antimeridian またぎを示すフラグ `BBOX_AM`（`0` / `1`）を追加。`KEPT_PROPERTIES` セットに同 5 キーを追加して Tippecanoe で保持する。

frontend 側は `domain/territory/territory-bounds.ts` でこれら 5 プロパティを読み出して `TerritoryBounds` 型に変換する純関数を提供する。

**Rationale**:
- pipeline の `mergeByName()` は既に各 NAME について最大ポリゴンを抽出しており（`largestPoly`、`largestArea`）、ラベル位置算出 `pointOnFeature(largestPoly)` でも使われている。同じ抽出結果から `turf.bbox()` を呼ぶだけのため、新規の地理計算ロジックは導入されない。
- アメリカ（本土＋アラスカ＋ハワイ）、ロシア（本土＋カリーニングラード）、イギリス（本島＋海外領土）など飛び地を持つ領土で、素朴な MultiPolygon 全体の bbox を取ると地球規模の矩形になり SC-002（手動パン不要率 95%）を達成できない。最大ポリゴンの bbox に絞ることで「本土を見る」というユーザー意図に整合する。
- ラベル表示（既に最大ポリゴンに 1 点表示）と挙動が一貫し、ユーザーの予測可能性が上がる。
- 計算コストはビルド時 1 回で、実行時は frontend が properties を読むだけの O(1)。

**Alternatives considered**:
- **frontend 側で `querySourceFeatures` 結果を集約**：PMTiles はタイル境界でクリップするため、本土 polygon が複数フィーチャに分かれる。タイル境界をまたぐリングを `union` で再結合してから面積を測る必要があり、`@turf/union` の追加依存と複雑なテストが必要。タイル読込状態によって「見た目上の最大」が揺れる不安定性も生じる。
- **クリック位置を含む polygon の bbox にフィット**：ユーザー意図への追従度は高いが、`SummaryNavStrip` などクリック位置を持たない経路ではフォールバックが必要となり挙動が混在する。複雑度に対して spec の目的（パネルに隠れない）はラベルと同方針で十分達成できる。
- **MultiPolygon 全体の bbox にフィット**：飛び地問題が解決せず却下。

---

## R2. 日付変更線をまたぐ領土への対応

**Decision**:
pipeline 側の `computeMainBbox(polygon)` 関数で antimeridian またぎを検出する。最大ポリゴンの外周リング座標を経度でソートし、隣接 2 点間の経度差を全て計算。最大ギャップが 180° を超える場合は antimeridian 越えと判定し、ギャップの東側経度を `west`、西側経度を `east` として `west > east` 形式（または east に 360° を加算した `east > 180`）の bbox を返す。あわせて `BBOX_AM = 1` フラグを立てる。
通常領土では `BBOX_AM = 0`、`west <= east <= 180`。

frontend 側はフラグを参照せず、そのまま `fitBounds([[west, south], [east, north]])` を呼ぶだけで MapLibre が antimeridian を正しく扱う（east > 180 を許容する）。

**Rationale**:
- フィジー（`west ≈ 178`、`east ≈ -178`）、キリバス、ロシア東端など、本土自体が antimeridian をまたぐケースで、素朴な `[minLng, maxLng]` 計算は west = -180、east = 180（地球全周）を返してしまう。
- pipeline 側で 1 回だけ計算するため frontend 側のロジックを単純化できる（`BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` を読んで渡すだけ）。
- `BBOX_AM` フラグは frontend で必須ではないが、データのデバッグや将来の用途（再フィット時の判定など）のために含める。
- 最大ポリゴン単体の rings は連続した 1 塊のため「最大ギャップ」アルゴリズムが安定して動作する（MultiPolygon 全体だと飛び地のギャップが antimeridian と紛らわしい）。

**Alternatives considered**:
- **`turf.bbox(polygon)` をそのまま使う**：antimeridian 越えで west = -180、east = 180 となり、地球全周にフィットしてしまう。
- **frontend 側で同等処理を実装**：pipeline 側で済ませた方が `domain/territory/` の責任範囲が薄くなり、ユニットテストもパイプライン側に集約できる。

---

## R3. パネル占有領域から `fitBounds` の padding 算出

**Decision**:
`use-panel-padding.ts` を新設し、`useIsMobile()` の結果に応じて以下の `PaddingInsets`（`{ top, right, bottom, left }`）を返す。

- **Desktop**:
  - `left = 16 (left-4) + 384 (w-96) + 16 (gap) = 416`
  - `top = right = bottom = 24`（地図の四辺に最低限の余白）
- **Mobile**（`BottomSheet` の `half` snap point を基準）:
  - `bottom = window.innerHeight * 0.4 + 16`（`HALF_VIEWPORT_RATIO` + gap）
  - `top = left = right = 16`

`use-panel-padding.ts` は `window.innerHeight` を `useEffect` で購読し、リサイズに追随する。BottomSheet の snap point 自体（half / expanded / collapsed の遷移）は購読対象に **含めない**（FR-010）。

**Rationale**:
- 既存実装値（`territory-info-panel.tsx` の `left-4 top-4 w-96`、`use-bottom-sheet-snap.ts` の `HALF_VIEWPORT_RATIO = 0.4`）を直接参照することで、UI レイアウト変更時の追従コストを最小化する。
- BottomSheet の初期 snap は `half` であり、選択直後のフィット対象としてこの高さを基準にするのが体験上も自然。
- FR-010 によりシート高さ変化に追随しないため、`snap` 状態を購読しない設計が自然な実装になる。

**Alternatives considered**:
- パネル DOM の `getBoundingClientRect()` を毎回測る：DOM 依存が増えテスタビリティが下がる。レイアウト定数の参照で十分。
- Tailwind クラスから値を抽出する仕組みを導入：複雑度に対してリターンが小さい。kebab-case の TS 定数で十分管理できる。

---

## R4. 最大ズーム上限値の決定

**Decision**:
`MAP_CONFIG` に `MAX_FIT_ZOOM = 5` を追加し、`fitBounds` 呼び出しの `maxZoom` オプションに渡す。

**Rationale**:
- `MAP_CONFIG.maxZoom = 10` は手動操作の上限であり、自動フィットでそこまで寄ると都市国家（ヴェネツィア共和国、シンガポール、バチカン等）で文脈が消える。
- 経験的に zoom 5 では「対象領土に隣接する 1〜2 国と海岸線が見える」程度に収まり、世界史学習用途で求められる文脈把握を保てる。
- `MAP_CONFIG.minZoom = 1` 〜 `maxZoom = 10` の中間（幾何平均は ~3.16、初期 zoom は 2）を考慮し、初期表示よりは寄り、最大ズームより十分手前の値を採る。

**Alternatives considered**:
- 領土サイズに応じて動的に上限を変える：仕様の単純性を損ない、テストすべき場合分けが増える。spec の SC-001/002 には固定上限で十分到達できる。
- `MAP_CONFIG.maxZoom` をそのまま使う：都市国家で過度ズームインが発生し、SC-002 を達成できない。

---

## R5. アニメーションキャンセルの確認

**Decision**:
特別な制御は導入せず、MapLibre の `fitBounds` が前回アニメーションを自動キャンセルする挙動に依存する。`use-camera-fit-on-selection.ts` 内では `mapRef.current?.fitBounds(...)` を呼び切りで実行する。

**Rationale**:
- MapLibre GL JS の `easeTo` / `flyTo` / `fitBounds` は内部的に `cameraForBounds` → `easeTo` という流れで、新しい呼び出しは前回の `_easeId` を破棄して走る（ソース実装で確認）。
- React 側で AbortController を導入しても、最終的に MapLibre 側のキャンセルに依存する以上、二重制御は冗長。

**Alternatives considered**:
- `fitBounds` 呼び出しを debounce / throttle：選択は通常ユーザーの能動操作であり頻度が高くない。debounce はかえって体感応答性を下げる。
- `mapRef.current?.stop()` を毎回呼んでから `fitBounds`：`fitBounds` 内部で同等処理が走るため重複。

---

## R6. bbox プロパティの取得経路

**Decision**:
2 経路の取得手段を `domain/territory/territory-bounds.ts` で吸収する：

1. **クリック由来**：`MapLayerMouseEvent.features[0].properties` に `BBOX_W` / `BBOX_S` / `BBOX_E` / `BBOX_N` / `BBOX_AM` が入る。
2. **非クリック由来**（`SummaryNavStrip` などプログラム的選択）：`mapRef.getMap().querySourceFeatures(SOURCE_ID, { sourceLayer: 'territories', filter: ['==', ['get', 'NAME'], selectedTerritory] })` で 1 件取得し、その `properties` から同じ 5 プロパティを読む。

実装上は `use-camera-fit-on-selection.ts` 側で `selectedTerritory` の変化を契機に必ず後者の経路で取得する。クリック経路でもどのみち state 更新後に effect が発火するため、取得経路を 1 つに統一できる。

`querySourceFeatures` が空配列を返した場合（タイル未読込）：当該ソースの `sourcedata` イベントを 1 度購読し、`isSourceLoaded === true` を待って 1 度だけ再試行する。再試行時に `selectedTerritory` が変わっていれば古い試行をスキップ。

**Rationale**:
- 取得経路を effect 内 1 つに集約することで、フィット契機（state 駆動）と取得処理（state 駆動）が一致し、reducer 経路のテストが単純になる。
- pipeline 側で全タイルに同じ properties が複製されているため、`querySourceFeatures` が返すフィーチャはどれを取っても同じ bbox 値を持つ（タイル境界によらない）。
- `sourcedata` 経由の 1 回再試行は spec の SC-003（800ms 以内）を多くのケースで保てる現実的な妥協点。

**Alternatives considered**:
- クリック由来の event と非クリック由来で経路を分ける：分岐が増え、テスト対象も倍になる。利得が無い。
- ポーリング：CPU 浪費と競合制御が複雑。

---

## R7. 選択解除（panel close）時のカメラ位置維持

**Decision**:
`use-camera-fit-on-selection.ts` の依存配列を `[selectedTerritory, selectedYear]` とし、effect 本体の冒頭で `if (selectedTerritory == null) return;` のガード節を入れる。これにより `selectedTerritory` が `null` に遷移したとき effect は呼ばれるが何もせず、カメラ命令が発行されない。

**Rationale**:
- FR-007 を担保するための最小限のガード設計。
- React 18+ の strict mode では effect が二重実行されることがあるが、ガード節があるため副作用は冪等。

**Alternatives considered**:
- effect の deps から `selectedTerritory` を外す：当初の選択時にも反応しなくなり機能が成立しない。
- 別 effect で `selectedTerritory == null` を検知してフラグ管理：複雑度が上がるだけで利得なし。

---

## R8. prefers-reduced-motion 対応

**Decision**:
`use-camera-fit-on-selection.ts` 内で `window.matchMedia('(prefers-reduced-motion: reduce)').matches` を購読する小さなフック `usePrefersReducedMotion()` を追加し、`fitBounds` の `duration` に reduce のとき `0`、それ以外で `600`（ms）を渡す。`600ms` は SC-003（800ms 以内）に対し計算余地を残した値。

**Rationale**:
- a11y のベースライン。constitution Principle IV「Consistent User Experience」で「features that regress accessibility MUST NOT merge」が明示されている。
- 既存のグローバル CSS（`apps/frontend/src/index.css` 等）で `prefers-reduced-motion` を一括処理していないため、本機能側で個別対応する。
- `duration: 0` は MapLibre で「即座のジャンプ」になり、アニメーションを完全に抑止できる。

**Alternatives considered**:
- 常に `duration: 0`：reduced-motion 設定をしていないユーザーにとって空間的連続性が失われ、FR-008 に反する。
- グローバル CSS で `transition: none` を当てる：MapLibre の easeTo はキャンバス内アニメーションのため CSS では制御不可。

---

## 共通：動作確認用シナリオ（quickstart で参照）

R1〜R8 を統合した受入確認は `quickstart.md` 手順 5 に集約する。本ファイルの決定がすべて適用されているかは以下の代表ケースで検証する：

- **Desktop / 西ヨーロッパの中規模領土**（例: 1600 年フランス王国）→ 元位置でパネル背後に隠れ、選択後にパネル右側に中央寄せされる
- **Desktop / 都市国家**（例: 1500 年ヴェネツィア共和国）→ `MAX_FIT_ZOOM` で頭打ちになり過度ズームが起きない
- **Desktop / 大領土**（例: 1300 年モンゴル帝国）→ 領土の主要部分が padding 込み可視領域に収まる
- **Desktop / 飛び地を持つ領土**（例: 1900 年アメリカ合衆国）→ 本土（北米大陸の主要部分）にフィットし、アラスカ・ハワイを含めるための地球規模ズームアウトは発生しない
- **Desktop / antimeridian 越えの領土**（例: 1900 年ロシア帝国 / 現代フィジー）→ `BBOX_AM = 1` の bbox により太平洋側にまたぐ領域も含めて 1 つの矩形として収まる
- **Mobile / 南半球の領土**（例: 1900 年オーストラリア）→ BottomSheet 上の領域に中央寄せ
- **連続選択** → 最後の選択に収束、途中位置で停止しない
- **パネル close** → カメラ位置不変
- **prefers-reduced-motion: reduce** → アニメーションなしで即座にジャンプ
