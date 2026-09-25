---
version: alpha
name: 世界史地図
description: 世界史の地名を地図で確かめるための、装飾を抑えたシンプルなデザイン
colors:
  primary: "#1f3a5f"
  surface: "#ffffff"
  on-surface: "#1f2328"
  muted: "#5b6570"
  border: "#d5dbe1"
  highlight: "#e8eef5"
  error-surface: "#fdecea"
  on-error-surface: "#8a1c12"
  ocean: "#dce8f0"
  land: "#f5f3ec"
  coastline: "#8a9aa6"
  boundary: "#cfc8b8"
  city: "#b4462b"
  city-selected: "#1f3a5f"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  search-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  suggestion-active:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.primary}"
  suggestion-empty:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  selection-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  panel-border:
    backgroundColor: "{colors.border}"
  error-banner:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.on-error-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  map-ocean:
    backgroundColor: "{colors.ocean}"
  map-land:
    backgroundColor: "{colors.land}"
  map-coastline:
    backgroundColor: "{colors.coastline}"
  map-boundary:
    backgroundColor: "{colors.boundary}"
  boundary-note:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  map-city:
    backgroundColor: "{colors.city}"
  map-city-selected:
    backgroundColor: "{colors.city-selected}"
---

# 世界史地図 デザインシステム

## Overview

受験生・学習者が世界史に出てくる地名の位置を地図で確かめるための画面。装飾は抑え、主役はあくまで地図そのものにする。検索窓・選択パネル・国境線の注記は地図を邪魔しない最小限の要素として重ねるにとどめ、地図の縮尺・回転などの操作要素（ズームボタンなど）は置かない。

## Colors

- **Primary (`primary` #1f3a5f):** 深い紺色。候補選択時の強調テキストなど、操作の焦点を示す色として使う。
- **地図の色:**
  - `ocean`（#dce8f0）: 海の塗り。
  - `land`（#f5f3ec）: 陸の塗り。
  - `coastline`（#8a9aa6）: 海岸線。
  - `boundary`（#cfc8b8）: 現在の国境線。海岸線より弱い暖色の灰色にして、都市の点を邪魔しない。係争中の境界は同じ色の破線にする。
  - `city`（#b4462b）: 通常状態の都市の点。
  - `city-selected`（#1f3a5f）: 選択中の都市の点。`primary` と同じ色にして、選択状態と操作の焦点色を揃える。
- **UI の基本色:**
  - `surface`（#ffffff）: 検索窓・選択パネルなど UI 要素の背景。
  - `on-surface`（#1f2328）: `surface` の上に置く本文テキストの色。
  - `muted`（#5b6570）: 補足的な情報（候補が無いときの案内など）のテキスト色。
  - `border`（#d5dbe1）: パネル内の区切り線。
- **強調:**
  - `highlight`（#e8eef5）: 検索候補のうち、キーボード操作などで選択中の項目の背景。
- **エラー:**
  - `error-surface`（#fdecea）: エラー表示の背景。
  - `on-error-surface`（#8a1c12）: エラー表示のテキスト色。

## Typography

- `body`: 検索窓の入力文字と検索候補の一覧に使う。
- `label`: 補足情報（「該当する地名がありません」など）に使う。
- `title`: 選択パネルに表示する都市名に使う。
- `caption`: 地図の右下に出す国境線の注記に使う。

## Layout

全画面に地図を敷き、その上に検索窓と選択パネルを重ねて配置する。

- **PC（画面幅 768px 以上）:** 検索窓は左上に配置し、幅は最大 24rem までとする。選択パネルは右上に配置し、幅は 18rem とする。
- **スマートフォン（768px 未満）:** 検索窓は画面上部に配置する。選択パネルは画面下部からせり上がるシート状の表示にする。
- 検索窓・選択パネルと画面端の間の外側の余白は、PC・スマートフォンともに `spacing.md` を使う。
- 国境線の注記は右下に置き、画面端との余白は `spacing.sm` を使う。スマートフォンで選択パネルを開いている間は隠す。

## Elevation & Depth

装飾を抑えたフラットな見た目を基本とし、影は要素を地図から浮かせるための最小限のものだけを使う。検索窓・検索候補・選択パネル・エラー表示・国境線の注記の説明には、Tailwind の `shadow-md` 相当の弱い影を 1 段だけ付ける。それ以上の重ね付けはしない。

## Shapes

- 検索窓と検索候補の一覧: `rounded.md`
- 選択パネル: `rounded.lg`
- エラー表示: `rounded.sm`
- 国境線の注記: `rounded.sm`（ⓘ で開く説明は `rounded.md`）

## Components

- `search-box`: 検索窓本体。背景は `surface`、文字は `on-surface`、書体は `body`。
- `suggestion-active`: 検索候補のうちキーボード操作等で選択中の項目。背景は `highlight`、文字は `primary`。
- `suggestion-empty`: 「該当する地名がありません」の表示。文字は `muted`、書体は `label`。
- `selection-panel`: 選択中の都市名を表示するパネル。背景は `surface`、文字は `on-surface`、書体は `title`。
- `panel-border`: 選択パネル内の区切り線の色。
- `error-banner`: 「地図の読み込みに失敗しました」などのエラー表示。背景は `error-surface`、文字は `on-error-surface`。
- `map-ocean` / `map-land` / `map-coastline` / `map-boundary`: ベースマップの海・陸・海岸線・国境線の塗り。
- `map-city` / `map-city-selected`: 都市の点の通常状態・選択状態の塗り。
- `boundary-note`: 地図の右下の国境線の注記。背景は半透明の `surface`、文字は `muted`、書体は `caption`。

## Do's and Don'ts

- Do 地図の主役を邪魔しないよう、UI 要素は検索窓・選択パネル・国境線の注記だけにとどめる
- Don't 地図の上に地名のラベルを常時表示しない（都市の情報は検索と選択パネルで確認する）
- Don't 画面の文言を自分で考えて足したり変えたりしない（必要なら案を示してユーザーの承認を得る）
- Don't 色やフォントの値を直接書かず、必ずこのファイルのトークン（CSS 変数）を使う
