# データモデル: フロントエンド情報設計・UX改善

**日付**: 2026-02-21 | **ブランチ**: `003-improve-frontend-ux`

## 状態モデルの変更

### 既存のAppState（変更なし）

現在の`AppState`には6つの改善に必要なフィールドがすべて含まれている:

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

#### OnboardingHintの状態（`useOnboardingHint`フック）

```typescript
interface OnboardingHintState {
  isVisible: boolean;    // ヒントが現在表示されているか
  isDismissed: boolean;  // ヒントが一度でも非表示にされたか（localStorageから）
}
```

- **永続化**: `localStorage`キー `"world-history-map:hint-dismissed"` → `"true"` | 未設定
- **ライフサイクル**: マウント時にlocalStorageをチェック → 未非表示なら表示 → 10秒後またはユーザー操作で自動非表示 → localStorageに書き込み

#### YearDisplayのアニメーション状態（コンポーネントレベル）

```typescript
// YearDisplayコンポーネント内部
const [displayYear, setDisplayYear] = useState(year);  // 現在レンダリングされている年代
const [visible, setVisible] = useState(true);           // フェード用のopacityトグル
```

- 永続化なし。純粋なトランジェントなアニメーション状態。

#### BottomSheetの状態（コンポーネントレベル）

```typescript
// BottomSheet / useSwipeToClose 内部
const startY = useRef(0);     // タッチ開始のY座標
const startTime = useRef(0);  // タッチ開始のタイムスタンプ
```

- 永続化なし。タッチトラッキング用のrefのみ。

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
  onOpenLicense: () => void;
}
```
**動作**: 画面右上にProjectionToggle + ライセンスボタン + GitHubリンクをグループ化。すべてのブレイクポイントで一貫した位置。控えめな視覚スタイル（アイコンは`text-white/60`、ボタン背景は不透明）。
**依存**: `ProjectionToggle`、mapのref（投影法状態用）

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

#### 4. OnboardingHint

**配置先**: `components/onboarding-hint/onboarding-hint.tsx`
**Props**: なし（自己完結型、`useOnboardingHint`フックから状態を読み取る）
**動作**: 画面下部のトースト通知。操作ヒントを表示。10秒後に自動非表示。閉じるボタンクリックまたはマップ操作でも非表示。
**依存**: `useOnboardingHint`フック

#### 5. BottomSheet

**配置先**: `components/ui/bottom-sheet.tsx`
**Props**:
```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  'aria-labelledby'?: string;
}
```
**動作**: モバイル専用のボトムシート。スライドアップアニメーション、ドラッグハンドル、背景タップクローズ、スワイプクローズ対応。`createPortal`で描画。
**依存**: `useSwipeToClose`フック、`useEscapeKey`フック、`useFocusTrap`フック

### 新規フック

#### 1. useSwipeToClose

**配置先**: `hooks/use-swipe-to-close.ts`
**シグネチャ**:
```typescript
function useSwipeToClose(
  isActive: boolean,
  handleRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void
```
**動作**: ハンドル要素にタッチイベントリスナーをアタッチ。下方向スワイプ（80px超の距離 または 0.5px/ms超の速度）を検知し、`onClose`を呼び出す。

#### 2. useIsMobile

**配置先**: `hooks/use-is-mobile.ts`
**シグネチャ**:
```typescript
function useIsMobile(breakpoint?: number): boolean
```
**動作**: ビューポート幅がブレイクポイント（デフォルト768）未満の場合に`true`を返す。`window.matchMedia`と`change`イベントリスナーを使用。

#### 3. useOnboardingHint

**配置先**: `hooks/use-onboarding-hint.ts`
**シグネチャ**:
```typescript
function useOnboardingHint(): {
  isVisible: boolean;
  dismiss: () => void;
}
```
**動作**: マウント時にlocalStorageをチェック。表示状態と非表示コールバックを返す。自動非表示タイマーを管理。localStorageが利用不可の場合もグレースフルに対応。

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
- `OnboardingHint`コンポーネントを追加
- インラインのライセンス/GitHubボタンを削除（ControlBarに移動）

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
│  ┌─────────────────────────────────────────────┐ │
│  │         初回ヒントトースト                    │ │  ← 初回訪問時のみ (z-20)
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

モバイルレイアウト (768px未満):
┌───────────────────────┐
│  [1650]     [ControlBar]│
│                       │
│        MAP            │
│                       │
│  ┌───────────────────┐│
│  │  ═══ (ハンドル)    ││  ← BottomSheet (60dvh)
│  │  InfoPanel        ││
│  │  (スクロール可)    ││
│  └───────────────────┘│
│  [◀ 年代セレクター ▶ ] │
└───────────────────────┘
```
