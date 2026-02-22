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

**背景**: FR-009〜FR-013は、モバイル（768px未満）で情報パネルを3段階スナップのボトムシートとして表示し、デスクトップではサイドパネルを維持することを要求している。

**決定**: 3段階スナップ（collapsed/half/expanded）の`BottomSheet` UIコンポーネントと、スナップ制御を管理する`useBottomSheetSnap`フックを実装。Google Mapsアプリのスマホ時の挙動を参考にした設計。レスポンシブ分岐には`window.matchMedia`を使用する`useIsMobile`フックを使用。

**根拠**:
- 外部ジェスチャー/アニメーションライブラリは不要（YAGNI）。ネイティブの`touchstart`/`touchmove`/`touchend`イベントでスワイプ検知とリアルタイムドラッグが十分。
- heightベースのトランジション（`transition: height 300ms cubic-bezier(0.32, 0.72, 0, 1)`）でスナップ間をアニメーション。ドラッグ中はrAFでheightをリアルタイム更新。
- モバイル検知に`matchMedia`フックを選択した理由（CSS-onlyの`hidden md:block`ではなく）:
  - DOMの二重レンダリングを回避（CSSアプローチでは両パネルバリアントがDOMに存在する）
  - ARIA属性管理を簡素化（一度に1つの`role="dialog"`のみがアクティブ）
  - 本プロジェクトはCSR専用（Vite）のため、SSRのhydrationミスマッチの懸念なし

**スワイプ検知の設計**:
- スワイプジェスチャーをヘッダー領域（ドラッグハンドル + タイトル + divider）に限定し、コンテンツスクロールとの競合を防止
- 速度ベースのフリック検出: ≥0.5px/ms → 1段階遷移（高速な操作に対する即応性）
- 距離ベースの遷移: 速度が閾値未満の場合、最近接スナップポイントに遷移
- collapsed状態から下方向スワイプ → パネルを閉じる（onClose呼び出し）
- ヘッダー領域のみ `touch-action: none`、コンテンツ領域はブラウザデフォルト

**ボトムシートの仕様**:
- 3段階スナップ: collapsed（ヘッダー実測高のみ）、half（40vh）、expanded（90vh）
- デフォルトスナップ: half（領土選択時に開く）
- バックドロップ: expanded時のみ表示（黒50%、タップで閉じる）
- フォーカストラップ: expanded時のみアクティブ
- オーバーフロー: collapsed時は`overflow-hidden`、half/expanded時は`overflow-y-auto`
- 入場アニメーション: double rAFによるheight 0 → snap heightの遷移
- Portal: `createPortal(document.body)`で描画し、`<main>`の`overflow-hidden`とスタッキングコンテキストから脱出

**検討した代替案**:
- **CSS-onlyレスポンシブ**（`hidden md:block` / `md:hidden`）: DOMの二重化とARIAの複雑さのため不採用。
- **外部ライブラリ**（react-spring, framer-motion）: YAGNIにより不採用。ネイティブタッチイベント+CSSトランジションで十分。
- **2状態ボトムシート**（開/閉のみ）: 初期実装後、Google Mapsアプリを参考にした3段階スナップに改善。collapsed/half時の地図操作可能性が重要。

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

## ~~R4: localStorageによる初回ヒント~~ (削除)

> **スコープ除外**: OnboardingHint機能は実装後に不要と判断し削除。アプリのUIが十分に直感的であるため。関連コード・テスト・localStorageの使用はすべて削除済み。
