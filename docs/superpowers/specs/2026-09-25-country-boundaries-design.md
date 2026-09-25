# 現代の国境線 設計書

- 作成日: 2026-09-25
- 状態: レビュー待ち
- 関連: [MVP 設計書](2026-09-23-world-history-map-design.md)（§2 で国境を「MVP に含めないもの」としていた）

## 1. 目的

都市の点だけだと、ユーラシアの内陸部（中央アジア・モンゴル高原など）では位置関係がつかみにくい。現代の国境を薄く重ねて、「いまのどの国のあたりか」を手がかりにできるようにする。

成功の基準:

- 初期表示（10 都市が収まる範囲）で、都市の点を邪魔しない薄さで国境線が見える
- 係争中の境界が、確定した国境と見分けられる
- 利用者が、線が当時の国境ではなく現在の国境だとわかる。出典と係争地の扱いを確かめられる

## 2. スコープ

含めるもの:

- 陸上の国境線（Natural Earth）。係争中の境界は破線にする
- 地図の右下の注記と、出典・係争地の扱いを開く ⓘ ボタン

含めないもの:

- 国名のラベル、国ごとの塗り分け
- 海上の境界（北方領土の線だけは例外。§3）
- 時代ごとの国境・勢力範囲
- 国境線の表示を切り替える操作

## 3. データ

### 出典

Natural Earth v5.1.2（パブリックドメイン）。既存のベースマップと同じく GitHub `nvkelso/natural-earth-vector` のタグ `v5.1.2` から取得し、sha256 で検証する。

| ファイル | 縮尺 |
|---|---|
| `ne_{縮尺}_admin_0_boundary_lines_land.geojson`（陸上の国境線） | 110m・50m・10m |
| `ne_{縮尺}_admin_0_boundary_lines_disputed_areas.geojson`（係争地の線） | 50m・10m（110m は存在しない） |

### 日本の立場での絞り込み

Natural Earth は線ごとに既定の種別（`FEATURECLA`）と、国ごとの立場での種別（`FCLASS_JP` など）を持つ。`FCLASS_*` が空の線は既定の種別に従い、`Unrecognized` の線はその国の立場では描かない（Natural Earth の Quick Start と同じ扱い）。これを使って日本の立場の線を選ぶ。

陸上の国境線のファイル:

1. `FEATURECLA` が `Overlay limit`（朝鮮半島の非武装地帯の縁、キプロスの緩衝地帯など）と `Lease limit`（バイコヌールの租借地）の線は、国境ではないので除く
2. 種別を `FCLASS_JP ?? FEATURECLA` とする
3. 種別が `Unrecognized` の線は除く（西サハラの管理ラインなど）

係争地の線のファイル:

- `FCLASS_JP` が空でも `Unrecognized` でもない線だけを使う。日本の立場で明示的に描くとされている線で、v5.1.2 では 4 本（北方領土の択捉島とウルップ島の間の線、ゴラン高原、レバノンの主張線、西サハラ）
- `FCLASS_JP` が空の線は他国の主張線なので使わない

残った線は、種別が `International boundary` で始まれば実線、それ以外（`Disputed`・`Line of control`・`Claim boundary`・`Indefinite`・`Indeterminant frontier` など）は係争線として破線にする。線ごとに個別の判断はしない。

主な線の見え方:

| 場所 | 描き方 |
|---|---|
| カシミール（印パの管理ライン、中印の係争線、シアチェン氷河） | 破線 |
| クリミア半島の付け根（日本の立場では主張境界） | 破線 |
| 朝鮮半島の軍事境界線（管理ライン） | 破線 |
| 北方領土（日本の立場では国際境界） | 実線 |

### 成果物

- 前処理のスクリプト（データリポジトリ、TypeScript）が、上の規則で絞り込んだ GeoJSON を縮尺ごとに出す。各線の属性は `disputed`（boolean）だけにする
- `build-basemap.sh` が縮尺ごとの tippecanoe に `boundary` レイヤーを足す。ほかの属性は落とし、`disputed` だけ残す
- ズームは既存と同じ（110m → z0–1、50m → z2–3、10m → z4–6）。110m には係争地の線のファイルが無いので、北方領土の線は z2 から出る
- `verify-basemap.ts` が確かめるレイヤーに `boundary` を足す。サイズの目標（15 MB 未満）は変えない。追加するデータは 3 縮尺合わせて GeoJSON で約 3.5 MB
- データリポジトリの CLAUDE.md にあるソースレイヤー名の記述に `boundary` を足す

## 4. 画面

### 地図のスタイル

`land` と `coastline` の間に 2 つの line レイヤーを足す。

| レイヤー | 対象 | 線 |
|---|---|---|
| `boundary` | `disputed` が false | 実線 |
| `boundary-disputed` | `disputed` が true | 破線（`line-dasharray: [3, 2]`） |

色は `#cfc8b8`（陸 `#f5f3ec` の上でうっすら見える暖色の灰色）、太さは 0.6。海岸線（`#8a9aa6`・0.8）より弱くする。

### 注記

地図の右下に常に 1 行出し、横の ⓘ ボタンで詳しい説明を開く。MapLibre・Mapbox の帰属表示ボタンと同じ形にする。

- 常に出す行: 「※薄い線は現在の国境」。12px・`muted` 色、半透明の `surface` 背景
- ⓘ を押すと、行の上に説明が開く。もう一度押すか、地図に触れると閉じる
- 説明の中の「Natural Earth」は https://www.naturalearthdata.com/ へのリンクにし、新しいタブで開く
- ⓘ ボタンは `aria-label` と `aria-expanded` を持つ
- PC 幅では右下に常に出す（選択パネルは右上なので重ならない）
- 375px 幅では、選択パネル（下部）を開いている間は注記ごと隠す。出しておくとパネルの下からはみ出すため

モック: https://claude.ai/artifact/AEkexQJLJFENUKTXTU61q6

### 追加する UI 文言

MVP 設計書 §7 の一覧に、次の文言を加える。

| 場所 | 文言 |
|---|---|
| 地図の右下に常に出す行 | ※薄い線は現在の国境 |
| ⓘ ボタン（aria-label） | 国境線について |
| ⓘ で開く説明（1 文目） | 国境線は Natural Earth のデータを使っています。 |
| ⓘ で開く説明（2 文目） | 係争中の境界は破線で示しています。どの境界を係争中とするかは、Natural Earth がまとめた日本の見解に従っています。 |

### デザイントークン

DESIGN.md に次を足し、`pnpm tokens` で `theme.css` を作り直す。

- colors: `boundary`（#cfc8b8）。既存の UI 用の `border` と名前がぶつからないようにする
- typography: `caption`（12px、行の高さ 1.4）
- components: `map-boundary`（国境線）、`boundary-note`（注記の行と説明）
- Do's and Don'ts の「UI 要素は検索窓と選択パネルだけにとどめる」に、国境線の注記を加える

## 5. テスト

- データリポジトリ: 絞り込みと実線・破線の振り分けを Vitest で確かめる（`Overlay limit`・`Lease limit`・`Unrecognized` を除くこと、`FCLASS_JP` が空なら `FEATURECLA` に従うこと、係争地の線のファイルは `FCLASS_JP` が明示されたものだけ使うこと）。`basemapCheck` のテストを `boundary` に合わせる
- アプリ: `style.test.ts` でレイヤー順（`ocean, land, boundary, boundary-disputed, coastline, cities, cities-hit`）、フィルター、破線の指定、色を確かめる
- 実ブラウザで PC 幅と 375px 幅を確かめる。z0–1・z2–3・z4–6 で国境線が出ること、注記の開閉、375px 幅で選択パネルを開くと注記が隠れること

## 6. 進め方

1. データリポジトリで前処理とベースマップの生成を直し、`pnpm basemap:build` と `pnpm copy` でアプリの `public/data/basemap.pmtiles` を更新する
2. アプリでスタイル・注記・トークン・文言を足す
3. 両リポジトリとも `claude/eurasia-borders-display-8syuzu` ブランチで作業する

ベースマップの生成には tippecanoe が要る。作業環境に無く入れられない場合は、ユーザーにローカルでの `nix develop -c pnpm basemap:build` と `pnpm copy` をお願いする。
