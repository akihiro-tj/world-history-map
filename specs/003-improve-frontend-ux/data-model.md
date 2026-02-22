# データモデル: フロントエンド情報設計・UX改善

**日付**: 2026-02-21 | **ブランチ**: `003-improve-frontend-ux`

## 状態モデルの変更

### 既存のAppState（変更なし）

現在の`AppState`には5つの改善に必要なフィールドがすべて含まれている:

```typescript
interface AppState {
  selectedYear: number;              // 使用先: YearDisplay, TerritoryHighlightLayer
  selectedTerritory: string | null;  // 使用先: TerritoryHighlightLayer
  isInfoPanelOpen: boolean;          // 使用先: BottomSheet / サイドパネル
  mapView: MapViewState;             // 変更なし
  isLoading: boolean;                // 変更なし
  error: string | null;              // 変更なし
}
```

`AppStateContext`に新しいフィールドやアクションは不要。既存の`selectedTerritory`がハイライトレイヤーのフィルターを駆動し、`selectedYear`が年代表示を駆動する。

### 新しいローカルState（コンポーネントレベル）

#### YearDisplayのアニメーション状態（コンポーネントレベル）

```typescript
// YearDisplayコンポーネント内部
const [displayYear, setDisplayYear] = useState(year);  // 現在レンダリングされている年代
const [visible, setVisible] = useState(true);           // フェード用のopacityトグル
```

- 永続化なし。純粋なトランジェントなアニメーション状態。

#### BottomSheetの状態（`useBottomSheetSnap`フック）

```typescript
type SnapPoint = 'collapsed' | 'half' | 'expanded';

interface UseBottomSheetSnapReturn {
  snap: SnapPoint;            // 現在のスナップポイント
  setSnap: (s: SnapPoint) => void;
  sheetStyle: React.CSSProperties;  // height + transition + will-change
  isDragging: boolean;        // ドラッグ中かどうか
}
```

- 永続化なし。スナップポイントはトランジェントなUI状態。
- ドラッグ中は `transition: none` + rAF で height をリアルタイム更新、リリース時に `transition: height 300ms cubic-bezier(0.32, 0.72, 0, 1)` で最近接スナップにアニメーション。

#### モバイル検知（`useIsMobile`フック）

```typescript
// 戻り値
const isMobile: boolean;  // ビューポート幅が768px未満の場合true
```

- `window.matchMedia('(max-width: 767px)')`から導出。

## コンポーネント設計

### 新規コンポーネント

#### 1. YearDisplay

**配置先**: `components/year-display/year-display.tsx`
**Props**:
```typescript
interface YearDisplayProps {
  year: number;
}
```
**動作**: フォーマットされた年代を表示し、変更時にフェードアニメーションを実行。スクリーンリーダー通知のために`aria-live="polite"`を使用。
**依存**: `formatYear()`ユーティリティ

#### 2. ControlBar

**配置先**: `components/control-bar/control-bar.tsx`
**Props**:
```typescript
interface ControlBarProps {
  projection: ProjectionType;
  onToggleProjection: (p: ProjectionType) => void;
  onOpenLicense: () => void;
}
```
**動作**: 画面右上にProjectionToggle + ライセンスボタン + GitHubリンクをグループ化。すべてのブレイクポイントで一貫した位置。控えめな視覚スタイル（アイコンは`text-white/60`、ボタン背景は不透明）。
**依存**: `ProjectionToggle`（投影法状態はApp.tsxからprops経由で受け取る）

#### 3. TerritoryHighlightLayer

**配置先**: `components/map/territory-highlight-layer.tsx`
**Props**:
```typescript
interface TerritoryHighlightLayerProps {
  sourceId: string;
  sourceLayer: string;
  selectedTerritory: string;
}
```
**動作**: NAMEプロパティでフィルタリングされた2つのMapLibreレイヤー（fill + line）をレンダリング。`selectedTerritory`が非nullの場合のみ条件付きレンダリング。
**依存**: react-map-gl `Layer`コンポーネント

#### 4. BottomSheet

**配置先**: `components/ui/bottom-sheet.tsx`
**Props**:
```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  'aria-labelledby'?: string;
}
```
**動作**: モバイル専用の3段階スナップボトムシート（collapsed/half/expanded）。header は sticky でドラッグハンドルを含む。expanded 時のみバックドロップ表示とフォーカストラップが有効。`createPortal`で描画。入場時はdouble rAFによるheight 0→snap heightのトランジション。
**依存**: `useBottomSheetSnap`フック、`useEscapeKey`フック、`useFocusTrap`フック

### 新規フック

#### 1. useBottomSheetSnap

**配置先**: `hooks/use-bottom-sheet-snap.ts`
**シグネチャ**:
```typescript
function useBottomSheetSnap(options: {
  isActive: boolean;
  headerRef: RefObject<HTMLElement | null>;
  sheetRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialSnap?: SnapPoint;
}): {
  snap: SnapPoint;
  setSnap: (s: SnapPoint) => void;
  sheetStyle: React.CSSProperties;
  isDragging: boolean;
}
```
**動作**: headerRefにtouchstart/touchmove/touchendリスナーをアタッチ。3段階スナップ（collapsed: ヘッダー実測高、half: 40vh、expanded: 90vh）間の遷移を管理。速度≥0.5px/msのフリックで1段階遷移、それ以外は最近接スナップ。collapsed状態から下スワイプでonClose呼び出し。

#### 2. useIsMobile

**配置先**: `hooks/use-is-mobile.ts`
**シグネチャ**:
```typescript
function useIsMobile(breakpoint?: number): boolean
```
**動作**: ビューポート幅がブレイクポイント（デフォルト768）未満の場合に`true`を返す。`window.matchMedia`と`change`イベントリスナーを使用。

### 新規ユーティリティ

#### formatYear（抽出）

**配置先**: `utils/format-year.ts`
**シグネチャ**:
```typescript
function formatYear(year: number): string
```
**動作**: 負の年には`"前{n}"`を、正の年には`String(n)`を返す。`year-selector.tsx`（現在はローカル関数）から抽出し、`YearDisplay`で再利用。

## 変更対象コンポーネント

### App.tsx

**変更内容**:
- `YearDisplay`コンポーネントを追加（画面上部中央）
- インラインのfooterを`ControlBar`コンポーネントに置換（画面右上）
- インラインのライセンス/GitHubボタンを削除（ControlBarに移動）
- 投影法状態をApp.tsxにリフトアップし、`ControlBar`にprops経由で渡す

### MapView（`map-view.tsx`）

**変更内容**:
- `ProjectionToggle`をMapViewから削除（ControlBarに移動）
- `<Source>`内に条件付き`TerritoryHighlightLayer`を追加
- ControlBarが利用できるように投影法の状態/setterをエクスポート（またはAppStateにリフトアップ）

### TerritoryInfoPanel（`territory-info-panel.tsx`）

**変更内容**:
- `useIsMobile()`で描画を分岐
- デスクトップ（768px以上）: 既存の`PanelWrapper`（サイドパネル、left-4 top-4）
- モバイル（768px未満）: パネルコンテンツを`BottomSheet`コンポーネントでラップ
- 共有パネルコンテンツを`PanelContent`内部コンポーネントとして抽出

### YearSelector（`year-selector.tsx`）

**変更内容**:
- ローカルの`formatYear`関数を`utils/format-year.ts`からのimportに置換

## レイヤー描画順序

```text
[下]
  background          — 既存の暗い背景色 (#1a2a3a)
  territory-fill      — 既存の色分け領土フィル (opacity 0.7)
  territory-highlight-fill    — 新規: 白色フィル (opacity 0.15) 領土選択時
  territory-highlight-outline — 新規: 白色ライン (3.5px) 領土選択時
  territory-label     — 既存のテキストラベル
[上]
```

## レイアウト構造（変更後）

```text
┌─────────────────────────────────────────────────┐
│  [YearDisplay: "1650"]              [ControlBar] │  ← 最前面レイヤー (z-20)
│       (上部中央)                   (右上)        │
│                                  ┌──────┐        │
│                                  │ 🌐   │        │
│                                  │ ℹ️   │        │
│   ┌──────────────┐               │ </>  │        │
│   │ InfoPanel    │               └──────┘        │
│   │ (デスクトップ) │                               │
│   │              │         MAP                   │
│   └──────────────┘                               │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │ ◀  | 前200 | 1 | ... | 1650 | ... | 2000 |▶│ │  ← 年代セレクター (z-20)
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

モバイルレイアウト (768px未満) — BottomSheet half状態:
┌───────────────────────┐
│  [1650]     [ControlBar]│
│                       │
│        MAP            │  ← 地図操作可能（half/collapsed時）
│                       │
│  ┌───────────────────┐│
│  │  ═══ (ハンドル)    ││  ← BottomSheet half (40vh)
│  │  国名 ─────────── ││    ヘッダーはスティッキー
│  │  InfoPanel        ││    ↑スワイプで expanded (90vh)
│  │  (スクロール可)    ││    ↓スワイプで collapsed
│  └───────────────────┘│
│  [◀ 年代セレクター ▶ ] │
└───────────────────────┘
```
