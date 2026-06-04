---
name: design-mock
description: >-
  design-mocks/ 配下に、DESIGN.md と生成済みデザイントークンに則った単一 HTML モックを生成するスキル。
  新機能をいきなり実装に入らず、まずモックで確認・比較検討したいときに使う。
  DESIGN.md（ルール・意図）・theme.css（トークン）・実コンポーネント（具体レシピ）に加え、
  ui-ux-pro-max の `--domain ux`（インタラクション/アクセシビリティ）を実行時に参照し、
  トークン utility でモックを組む。比較する複数パターンは 1 つの design-mocks/<feature>/v<n>/index.html に
  並置し、比較検討を反復するごとに v1 → v2 とラウンドを重ねてブラウザで開く。
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
- **インタラクション / アクセシビリティ品質** — `ui-ux-pro-max` スキルの `--domain ux` を引いて、
  touch target・focus・loading/skeleton・reduced-motion・dark/light contrast・フォーム等の観点を補強する。
  これは**視覚言語（色 / タイポ / サーフェス）を上書きしない**。視覚の源は DESIGN.md / theme.css / 実コンポーネントのままで、
  ui-ux-pro-max は DESIGN.md がカバーしない振る舞い面を補完する位置づけ。`--design-system`・`style`・`color`・
  `typography`・`--stack` は使わない（確立済みトークンと矛盾しうる / React Native 前提で Web モックに不適）。

## 2 つの軸: パターン（横）とラウンド（縦）

モックは 2 つの軸を**明確に区別**する。この混同が最大の事故源。

- **パターン（横の軸・比較）**: 同時に見比べる、構造の異なる案（例: モーダル vs ボトムシート、
  シート内スライダー vs 画面上部移設）。互いの改良版ではなく**並列の選択肢**。
  → **1 つの HTML ファイル内に `<section>` として並置**し、1 スクロールで横断比較できるようにする。
  各案のラベルは内容を表す kebab-case（`header-stepper`・`screen-top-bar` 等）にする。**v1/v2 で分けない。**
- **ラウンド（縦の軸・反復） = version**: 比較検討そのものを反復する単位。フィードバックを受けて
  案を絞る・練り直して再び比較すると v2, v3… になる。→ `v<n>/index.html` というファイルで表す。

> 典型的な誤用: 「4 つの案を比較したい」を v1〜v4 に分けてはいけない。それは 1 ラウンド (v1) の
> 中の 4 パターンであり、**1 ファイル `v1/index.html` に並置**する。比較を反復して初めて v2 になる。

## 出力構造

```text
<リポジトリルート>/design-mocks/
├── index.html                  # 全モックのナビゲーション（毎回再生成）
└── <feature-name>/             # kebab-case
    └── v<n>/index.html         # 1 ラウンド = 1 ファイル。比較パターンは中に <section> で並置
```

- `feature-name` は kebab-case。比較検討の反復ごとに v1 → v2 → … と新ファイルを足し、既存ラウンドは上書きしない。
- 比較は「構造の差」（例: モーダル vs ボトムシート、表 vs カード）で行い、どのパターンも DESIGN.md に準拠させる。

## ワークフロー

### Step 1: 要件確認

1. `$ARGUMENTS` からモック対象を抽出する。
2. `Glob design-mocks/*/` で既存 feature / ラウンドを把握する。
3. 次を「確定済み / 不足」に分類する: feature 名（kebab-case） / 対象 UI の種別（floating panel・FAB・
   bottom sheet・year selector 等） / async か（→ 表示する状態） / desktop と mobile の両方を出すか /
   今回並置して比較するパターンとその比較軸 / 新規 feature の初回ラウンド (v1) か既存ラウンドの反復 (v(n+1)) か。
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
5. **UX 知見の補完（対象 UI に応じて条件付き）** — 対象がインタラクション・状態遷移・タッチを伴う場合
   （bottom sheet・FAB・form・slider・async 状態・chart・ナビゲーション等）、`ui-ux-pro-max` の `--domain ux` を
   対象 UI のキーワードで引き、適用すべき観点と Tailwind ユーティリティの当て方を Step 4 / Step 6 で使う:

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<対象UIのキーワード>" --domain ux -n 6
   ```

   キーワード例: bottom sheet → `"bottom sheet modal touch dismiss"`、async 状態 → `"loading skeleton async feedback"`、
   form → `"form label validation error"`、操作系 → `"touch target spacing focus"`、chart → `"chart legend tooltip accessible"`。
   floating panel の薄い静的表示などインタラクションを伴わない場合は省略してよい。

### Step 3: ラウンド (version) 決定

1. `Glob design-mocks/<feature-name>/v*/` で既存ラウンドを取得し、次番号を決める（初回は v1、
   既存ラウンドの反復なら最大値 +1）。比較したい複数パターンは version を増やすのではなく、同一ラウンドに並置する。
2. `mkdir -p design-mocks/<feature-name>/v<n>/`。

### Step 4: モック生成

`references/mock-shell.html` を雛形として複製し、マーカーを埋める:

1. **theme.css 注入**: `<style type="text/tailwindcss">` 内の `INJECT:` マーカーを、`theme.css` の `@theme{...}`
   の中身でそのまま置換する。
2. **base CSS 注入**: 2 つ目の `<style>` 内の `INJECT:` マーカーを、`index.css` の base 設定で置換する。
   `@import` 行は除き、`:root` のフォント設定・`@media (prefers-reduced-motion)`・`:focus-visible`・`.sr-only`
   など CDN で動く CSS だけを残す。`var(--color-*)` は `@theme` 由来でそのまま使える。
3. **ラウンドヘッダー / パターンセクション**: ヘッダーに feature 名・ラウンド (`{{ROUND}}`)・
   このラウンドの比較観点と関連リンク (`{{ROUND_SUMMARY}}`) を埋める。比較する各パターンは、雛形の
   `<section data-pattern>` を**案の数だけ複製**し、`{{PATTERN_SLUG}}`（内容を表す kebab-case）/
   `{{PATTERN_LABEL}}` / `{{PATTERN_NOTE}}` と `{{DESKTOP_MOCK}}` / `{{MOBILE_MOCK}}` を埋める。
   - 比較が単発（反復の確認等）なら section は 1 つでよい。複数案なら section を縦に積んで並置する。
   - chrome は全てトークン utility で書く。具体構成は Step 2 で読んだ実コンポーネントに合わせる
     （frosted treatment・header の hairline・状態表現など）。DESIGN.md の Layout / Elevation / Shapes / Components に従う。
   - async なら各状態を `[data-state="..."]` で用意する。async でなければ状態スイッチャ（`[data-state-switcher]`）を削除する。
   - mobile は re-home（FAB + bottom sheet）として組む。
   - パターンをまたいで `id` が重複しないよう、各 section 内の `id` / `aria-labelledby` 等は `{{PATTERN_SLUG}}` で名前空間化する。

### Step 5: ルート index.html を再生成

1. `Glob design-mocks/*/v*/index.html` を全列挙する。
2. `design-mocks/index.html` を再生成する。`mock-shell.html` と同じ要領で theme.css / base CSS を注入し、
   トークン utility で feature ごとにラウンド (v<n>) を列挙し、各ラウンドが比較するパターンを一行で添えた
   一覧（各ページへの相対リンク）にする。ナビ目的なので簡素でよい。

### Step 6: セルフレビュー

2 つの観点で照合し、違反があれば修正する。**再生成は最大 1 回**まで。

1. **視覚言語** — `DESIGN.md` の `## Do's and Don'ts` を読み直し、生成した HTML を各項目に照合する。
2. **インタラクション / アクセシビリティ** — Step 2 で `--domain ux` を引いた場合、取得した各ガイドラインの
   Do / Don't に照合する（touch target ≥44px・focus 可視・loading フィードバック・reduced-motion 尊重・
   dark/light の contrast・フォームのラベルとエラー位置 等）。mobile re-home（FAB + bottom sheet）と async 状態を重点的に見る。

### Step 7: open + 報告

```bash
open design-mocks/<feature-name>/v<n>/index.html
```

ユーザーに報告する:
- 生成パス / 表示した状態 / 比較したパターン / 前ラウンドからの差分（あれば）
- Step 6 のセルフレビュー結果（DESIGN.md の Do/Don't と、引いた場合は `--domain ux` ガイドラインへの照合結果、修正の有無）
- ルート index.html のパス（`open design-mocks/index.html`）

### Step 8: 反復（必要時）

修正指示があれば `AskUserQuestion` で扱いを確認する:
- **比較パターンの追加** → 現ラウンドの `v<n>/index.html` に `<section data-pattern>` を 1 つ足す。
  同一ラウンド内の比較なので version は増やさない。
- **案を絞った / 練り直して再比較** → 次ラウンド v(n+1) として新規作成（Step 2 から再実行）。既存ラウンドは残す。
- **既存パターンの軽微な調整** → 現ラウンドの該当 section を直接編集（編集後も Step 6 を再実行）。

## 注意事項

- 触ってよいのは `design-mocks/` 配下のみ。プロダクションコードや DESIGN.md / theme.css は変更しない。
- `ui-ux-pro-max` は `--domain ux` の参照（読み取り）だけに使う。`--persist`（`design-system/` 配下を生成）は使わない。
- `.gitignore` への追加可否はユーザー判断に委ねる（自動追加しない）。
