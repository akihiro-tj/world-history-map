# リサーチ: フロントエンド情報設計・UX改善

**日付**: 2026-02-21 | **ブランチ**: `003-improve-frontend-ux`

## R1: MapLibre 領土ハイライトレイヤー

**背景**: FR-006〜FR-008は、選択された領土を白色アウトライン（3-4px）と半透明白フィル（opacity 0.15）でマップ上にハイライト表示することを要求している。

**決定**: react-map-glの`<Layer>`コンポーネントを2つ追加し、NAMEプロパティによるフィルター式を使用する。独立した`TerritoryHighlightLayer`コンポーネントとして実装。

**根拠**:
- react-map-gl v8の`<Layer>`コンポーネントは`filter` propを受け取り、内部で`map.setFilter()`にマッピングする。ReactのstateにおいてselectedTerritoryが変更されると、フィルターが自動的に更新される。
- Expression filter構文 `['==', ['get', 'NAME'], selectedTerritory]` で、NAMEプロパティにより領土フィーチャーを直接マッチできる。
- 条件付きレンダリング（`{selectedTerritory && <TerritoryHighlightLayer />}`）の方が、filterを`undefined`にするアプローチ（全フィーチャーにマッチし、非表示にするために透明ペイントが必要）よりクリーン。
- `TerritoryLayer`とは別コンポーネントとする。ハイライトは独立した関心事（選択状態の可視化 vs データ描画）であるため。

**レイヤー順序**（下から上）:
1. `territory-fill` — 既存の色分けフィル
2. `territory-highlight-fill` — 白色フィル（opacity 0.15）
3. `territory-highlight-outline` — 白色ライン（3.5px幅）
4. `territory-label` — テキストラベル（常に最前面）

**検討した代替案**:
- **Feature State API**（`map.setFeatureState`）: より複雑で、現在のPMTilesデータに存在しないfeature ID管理が必要。
- **既存fillレイヤーのpaintを変更**: 選択ロジックがベースレイヤーに結合し、両方のテストが困難になる。

---

## R2: モバイルボトムシートの実装

**背景**: FR-012〜FR-014は、モバイル（768px未満）で情報パネルをスワイプクローズ可能なボトムシートとして表示し、デスクトップではサイドパネルを維持することを要求している。

**決定**: CSSトランジションによる`BottomSheet` UIコンポーネントと、ネイティブタッチイベントによる`useSwipeToClose`フックを実装。レスポンシブ分岐には`window.matchMedia`を使用する`useIsMobile`フックを使用。

**根拠**:
- 外部ジェスチャー/アニメーションライブラリは不要（YAGNI）。ネイティブの`touchstart`/`touchend`イベントでスワイプ検知は十分。
- CSS `transform: translateY()` + `transition`はコンポジタースレッドで実行され、60fpsアニメーションを保証。
- モバイル検知に`matchMedia`フックを選択した理由（CSS-onlyの`hidden md:block`ではなく）:
  - DOMの二重レンダリングを回避（CSSアプローチでは両パネルバリアントがDOMに存在する）
  - ARIA属性管理を簡素化（一度に1つの`role="dialog"`のみがアクティブ）
  - 本プロジェクトはCSR専用（Vite）のため、SSRのhydrationミスマッチの懸念なし

**スワイプ検知の設計**:
- スワイプジェスチャーをシート上部のドラッグハンドルバーに限定し（シート全体ではなく）、コンテンツスクロールとの競合を防止
- クローズ閾値: 80px距離 OR 0.5px/ms速度（ゆっくりドラッグと素早いフリックの両方をキャッチ）
- ドラッグハンドルのみ `touch-action: none`、コンテンツ領域は `touch-action: pan-y`

**ボトムシートの仕様**:
- 高さ: `60dvh`（仕様書の要件）
- オーバーフロー時の最大高さ: `80dvh`（仕様書のエッジケース）
- アニメーション: `translateY(100%) → translateY(0)`、300ms、`cubic-bezier(0.32, 0.72, 0, 1)`（iOS標準シート動作に近い自然な減速曲線）
- Portal: `createPortal(document.body)`で描画し、`<main>`の`overflow-hidden`とスタッキングコンテキストから脱出

**検討した代替案**:
- **CSS-onlyレスポンシブ**（`hidden md:block` / `md:hidden`）: DOMの二重化とARIAの複雑さのため不採用。
- **外部ライブラリ**（react-spring, framer-motion）: YAGNIにより不採用。2状態（開/閉）のみ必要。
- **マルチスナップボトムシート**: 不採用。仕様書が明示的に2状態のみ（60%で開、閉）を定義。

---

## R3: 年代表示のフェードアニメーション

**背景**: FR-002は、年代切替時に年代表示がフェードアニメーション（200-300ms）で更新されることを要求している。仕様書の明確化: 「旧数値フェードアウト→新数値フェードイン」。

**決定**: `useEffect` + CSSトランジションアプローチ（遅延値更新を伴うopacityトグル）で、真のフェードアウト→フェードイン効果を実現。

**根拠**:
- 仕様書は旧値のフェードアウト後に新値がフェードインすることを明示的に要求している。key-basedアプローチ（単純なリマウント+フェードイン）では新値のフェードインのみ表示され、旧値は即座に消える。
- 合計300ms: 150msフェードアウト（旧値）+ 150msフェードイン（新値）。仕様書の200-300ms範囲内。
- `prefers-reduced-motion`は既に`index.css`（79-88行）でグローバル対応済み。全要素に対して`transition-duration: 0.01ms !important`を設定。追加のJSフック不要。

**実装パターン**:
```tsx
const [displayYear, setDisplayYear] = useState(year);
const [visible, setVisible] = useState(true);

useEffect(() => {
  if (year === displayYear) return;
  setVisible(false); // fade out
  const id = setTimeout(() => {
    setDisplayYear(year); // swap value
    setVisible(true); // fade in
  }, 150);
  return () => clearTimeout(id);
}, [year, displayYear]);
```

**高速な年代切替への対応**: ユーザーが年代を素早く変更した場合（年代セレクターを連打等）、クリーンアップ関数が保留中のタイムアウトをクリアし、最新の年代でeffectが再実行される。古い値の残留を防止 — 最終的な年代のみがフェードインを完了する。

**検討した代替案**:
- **key-basedリマウント**（`<span key={year}>`）: よりシンプルだが、旧値のフェードアウトが表示されない。新値のフェードインのみ。
- **CSS `@keyframes` + key**（疑似フェード — 0→0→1）: フェードをシミュレートするが、「フェードアウト」フェーズ中に旧値は表示されない。
- **Web Animations API**: 単純なopacityトランジションには過剰。

---

## R4: localStorageによる初回ヒント

**背景**: FR-009〜FR-011は、初回訪問時のオンボーディングヒント（トースト形式）をlocalStorageで非表示状態を永続化することを要求している。

**決定**: localStorageと連携するカスタム`useOnboardingHint`フックとシンプルな`OnboardingHint`トーストコンポーネントを実装。

**根拠**:
- localStorageキー: `"world-history-map:hint-dismissed"`（衝突回避のために名前空間付き）
- マウント時にチェック: キーが存在 → 表示しない。非表示時 → キーに`"true"`を設定。
- `setTimeout`による10秒後の自動非表示。最初のマップクリックでも非表示になる。
- グレースフルデグラデーション: localStorageが利用不可の場合（プライベートブラウジング、無効化等）、エラーをキャッチし毎回ヒントを表示（仕様書のエッジケースに準拠）。

**トーストの設計**:
- 位置: 画面下部中央、年代セレクターの上（年代セレクターとマップの間の`z-index`が必要）
- コンテンツ: 1〜2つの短いメッセージ（例: 「領土をクリックして詳細を見る」「下部で年代を切り替え」）
- 閉じる: ×ボタン、マップ上の任意の場所をクリック、または10秒後の自動非表示
- アニメーション: マウント時にフェードイン、非表示時にフェードアウト

**検討した代替案**:
- **sessionStorage**: 不採用。仕様書（FR-011）によりヒントはセッション間で永続化される必要がある。
- **Cookieベース**: 不採用。クライアント専用機能には不要な複雑さ。
- **IndexedDB**: 不採用。単一のboolean値には過剰。
