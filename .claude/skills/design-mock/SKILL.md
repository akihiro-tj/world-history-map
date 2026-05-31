---
name: design-mock
description: >-
  design-mocks/ 配下に、DESIGN.md と生成済みデザイントークンに則った単一 HTML モックを生成するスキル。
  新機能をいきなり実装に入らず、まずモックで確認・比較検討したいときに使う。
  DESIGN.md（ルール・意図）・theme.css（トークン）・実コンポーネント（具体レシピ）を実行時に参照し、
  トークン utility でモックを組む。design-mocks/<feature>/v<n>/ にバージョン並列で保存しブラウザで開く。
argument-hint: "<モックしたい画面・機能の説明>"
disable-model-invocation: true
allowed-tools: ["Bash", "Glob", "Read", "Write", "Edit", "AskUserQuestion"]
---

# design-mock

実装前のデザイン確認・構造比較検討のために、単一 HTML のモックを生成して即ブラウザで開くスキル。

**引数**: "$ARGUMENTS"

## デザインの拠り所

モックは次を生成時に参照して組む:

- **色 / タイポ / spacing** — `packages/design-tokens/src/theme.css` の `@theme` をモックに注入し、
  `bg-surface-panel` `text-panel-title` `border-surface-border` 等のトークン utility で書く。
- **ルール・意図** — `DESIGN.md`（Overview / Colors / Typography / Layout / Elevation / Shapes /
  Components / Do's and Don'ts）に従う。
- **具体レシピ**（frosted panel の class 構成・状態表現・rose ストライプ等）— 該当する実コンポーネントに合わせる。

## 出力構造

```text
<リポジトリルート>/design-mocks/
├── index.html                  # 全モックのナビゲーション（毎回再生成）
└── <feature-name>/             # kebab-case
    ├── v1/index.html
    ├── v2/index.html
    └── ...
```

- `feature-name` は kebab-case。同一 feature への新規モックは v2, v3… と並列保持し既存版は上書きしない。
- 比較検討は構造の差（例: モーダル vs ボトムシート、表 vs カード）で行い、どの案も DESIGN.md に準拠させる。

## ワークフロー

### Step 1: 要件確認

1. `$ARGUMENTS` からモック対象を抽出する。
2. `Glob design-mocks/*/` で既存 feature / version を把握する。
3. 次を「確定済み / 不足」に分類する: feature 名（kebab-case） / 対象 UI の種別（floating panel・FAB・
   bottom sheet・year selector 等） / async か（→ 表示する状態） / desktop と mobile の両方を出すか /
   今回複数の構造案を並べて比較するか（する場合はどの軸で） / 新規 feature か既存 version の反復か。
4. **不足が 1 つでもあれば** `AskUserQuestion` で確認する。判定経緯は最終報告に残す。

### Step 2: デザイン源を読む

生成の直前にその時点の最新を読み、Step 4 で使う:

1. `DESIGN.md` 全文 — Overview / Colors / Typography / Layout / Elevation / Shapes / Components /
   **Do's and Don'ts**。
2. `packages/design-tokens/src/theme.css` — 注入する `@theme{...}`。利用可能なトークン utility 名の一覧でもある。
3. `apps/frontend/src/index.css` — base 設定（system font stack / `prefers-reduced-motion` / `:focus-visible` 等）。
4. 対象に近い**実コンポーネント** 1〜2 個を `Glob`/`Read` で特定して読む。例:
   `apps/frontend/src/components/territory-info/territory-info-panel.tsx`（frosted panel・RemoteData の状態）、
   `year-display/`、`year-selector/`、`era-summary-panel/`、`bottom-sheet/`、`feedback/`。

### Step 3: ディレクトリ / バージョン決定

1. `Glob design-mocks/<feature-name>/v*/` で既存 version を取得し、次番号を決める（最大値 +1、なければ v1）。
2. `mkdir -p design-mocks/<feature-name>/v<n>/`。

### Step 4: モック生成

`references/mock-shell.html` を雛形として複製し、マーカーを埋める:

1. **theme.css 注入**: `<style type="text/tailwindcss">` 内の `INJECT:` マーカーを、`theme.css` の `@theme{...}`
   の中身でそのまま置換する。
2. **base CSS 注入**: 2 つ目の `<style>` 内の `INJECT:` マーカーを、`index.css` の base 設定で置換する。
   `@import` 行は除き、`:root` のフォント設定・`@media (prefers-reduced-motion)`・`:focus-visible`・`.sr-only`
   など CDN で動く CSS だけを残す。`var(--color-*)` は `@theme` 由来でそのまま使える。
3. **メタ帯 / コンテンツスロット**: feature 名・version・関連リンクを埋め、`{{DESKTOP_MOCK}}` /
   `{{MOBILE_MOCK}}` に実 UI を組む。
   - chrome は全てトークン utility で書く。
   - 具体構成は Step 2 で読んだ実コンポーネントに合わせる（frosted treatment・header の hairline・状態表現など）。
   - DESIGN.md の Layout / Elevation / Shapes / Components の原則に従う。
   - async なら各状態を `[data-state="..."]` で用意する。async でなければ状態スイッチャ（`[data-state-switcher]`）を削除する。
   - mobile は re-home（FAB + bottom sheet）として組む。
   - 複数構造案の比較時は version を分ける（v1, v2…）か、同一 desktop 枠内に並置する。いずれも DESIGN.md 準拠。

### Step 5: ルート index.html を再生成

1. `Glob design-mocks/*/v*/index.html` を全列挙する。
2. `design-mocks/index.html` を再生成する。`mock-shell.html` と同じ要領で theme.css / base CSS を注入し、
   トークン utility で組んだ feature × version の一覧（各モックへの相対リンク）にする。ナビ目的なので簡素でよい。

### Step 6: セルフレビュー

`DESIGN.md` の `## Do's and Don'ts` を読み直し、生成した HTML を各項目に照合する。違反があれば修正する。
**再生成は最大 1 回**まで。

### Step 7: open + 報告

```bash
open design-mocks/<feature-name>/v<n>/index.html
```

ユーザーに報告する:
- 生成パス / 表示した状態 / 構造案 / 前 version からの差分（あれば）
- Step 6 のセルフレビュー結果（DESIGN.md の Do/Don't と照合した結果、修正の有無）
- ルート index.html のパス（`open design-mocks/index.html`）

### Step 8: 反復（必要時）

修正指示があれば `AskUserQuestion` で扱いを確認する:
- **大幅変更** → v(n+1) として新規作成（Step 2 から再実行）
- **軽微な調整** → 現 version を直接編集（編集後も Step 6 を再実行）

## 注意事項

- 触ってよいのは `design-mocks/` 配下のみ。プロダクションコードや DESIGN.md / theme.css は変更しない。
- `.gitignore` への追加可否はユーザー判断に委ねる（自動追加しない）。
