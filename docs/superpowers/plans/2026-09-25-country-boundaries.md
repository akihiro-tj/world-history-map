# 現代の国境線 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Natural Earth の現在の国境線（日本の立場、係争線は破線）をベースマップに足し、地図の右下に「※薄い線は現在の国境」と ⓘ で開く説明を出す。

**Architecture:** データリポジトリ（`/home/user/world-history-map-data`）で、Natural Earth の国境線を日本の立場で絞り込み、`disputed` 属性だけを付けた GeoJSON を作ってから、tippecanoe で `boundary` レイヤーとしてベースマップに足す。アプリ（`/home/user/world-history-map`）は `disputed` で実線・破線の 2 レイヤーに分けて描き、React のコンポーネントで注記を出す。

**Tech Stack:** Node 24 / pnpm 12.5.1 / TypeScript 7.0 / Vitest 5.0 / Biome 2.5 / tippecanoe（nix devShell。一時ブランチの GitHub Actions で動かす）/ pmtiles 4.5 / React 19.3 / Tailwind CSS 4.3 / maplibre-gl 6.11 / @google/design.md 0.4

**Spec:** `docs/superpowers/specs/2026-09-25-country-boundaries-design.md`（world-history-map。実装前に必ず読む）。モック: https://claude.ai/artifact/AEkexQJLJFENUKTXTU61q6

## Global Constraints

- 言語: コミットメッセージは英語。UI 文言・ドキュメント・コード内コメント・テスト名は日本語
- UI 文言は spec §4「追加する UI 文言」の 4 つだけ。一字一句そのまま使う（「※薄い線は現在の国境」は ※ の後ろに空白を入れない）。文言は `src/app/copy.ts` にしか書かない
- デザイントークンは `DESIGN.md` の front matter だけを編集し、`pnpm tokens` で `src/app/theme.css` を作り直す。色・角丸・余白・文字サイズの値を Tailwind のクラスや MapLibre のスタイルに直接書かない（`[2px]` のような任意値も使わない）
- 国境線: 色 `#cfc8b8`、太さ 0.6、係争線は `line-dasharray: [5, 10 / 3]`（MapLibre の破線の長さは線幅の倍数。線幅 0.6 で 3px / 2px になる）
- ベースマップのソースレイヤー名は `boundary`、属性は `disputed`（boolean）だけ。ズームは 110m → z0–1、50m → z2–3、10m → z4–6。サイズは 15 MiB 未満
- 両リポジトリとも `claude/eurasia-borders-display-8syuzu` ブランチで作業し、`git push -u origin claude/eurasia-borders-display-8syuzu` で push する。例外はベースマップを作るための一時ブランチ `claude/eurasia-borders-display-8syuzu-basemap`（データリポジトリ。Task 2 で作り、Task 3 で消す）だけ
- コミットメッセージの末尾に次の 2 行を付ける:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6
  ```
- テスト環境は Vitest の `node` 環境だけ（jsdom は入れない）。E2E テストは作らない。UI は実ブラウザで PC 幅と 375px 幅を確かめる
- 計画に書かれたテストの期待値が観測値と食い違ったら、期待値を観測値に合わせて書き換えず、BLOCKED として報告する

## Review Focus

- `FCLASS_JP` が `null` ではなく空文字の線 → 空として扱い、`FEATURECLA` に従う（Task 1 のテスト）
- tippecanoe が属性を落とし、`disputed` がタイルに入らない → 全部実線になって気付けないので、`verify-basemap` で `boundary` レイヤーに `disputed` があるかを検査する（Task 2 のテスト）
- タイルの線に `disputed` が無い（古いベースマップなど） → 線は消えずに実線で描かれる。実線レイヤーのフィルターを `!= true` にする（Task 3 のテスト）
- ⓘ を開いたまま地図をドラッグ・タップした → 説明が閉じる。説明の中のリンクを押しても閉じない（Task 4 の実ブラウザ確認）
- 375px 幅で選択パネルを開いている → 注記は隠れ、閉じると戻る。PC 幅では選択中でも出ている（Task 4 の実ブラウザ確認）

## ファイル構成

world-history-map-data:

```
scripts/lib/boundary.ts           # 新規: 日本の立場での絞り込みと disputed の付与（純関数）
scripts/lib/boundary.test.ts      # 新規
scripts/build-boundaries.ts       # 新規: キャッシュの GeoJSON を読み、縮尺ごとの boundary_<縮尺>.geojson を書く
scripts/build-basemap.sh          # 変更: 取得ファイル・sha256・boundary レイヤー・属性
scripts/lib/basemapCheck.ts       # 変更: boundary レイヤーと disputed 属性を検査
scripts/lib/basemapCheck.test.ts  # 変更
scripts/verify-basemap.ts         # 変更: vector_layers の fields を読む
CLAUDE.md                         # 変更: ソースレイヤー名の記述
```

world-history-map:

```
DESIGN.md                         # 変更: boundary 色・caption 文字・部品・本文
src/app/theme.css                 # 生成物（pnpm tokens）
src/map/style.ts                  # 変更: boundary / boundary-disputed レイヤー、MapColors.boundary
src/map/style.test.ts             # 変更
src/app/copy.ts                   # 変更: 注記の文言、NATURAL_EARTH_URL
src/app/BoundaryNote.tsx          # 新規: 右下の注記と ⓘ
src/app/App.tsx                   # 変更: BoundaryNote を置く
public/data/basemap.pmtiles       # 更新（データリポジトリの pnpm copy）
```

---

### Task 1: 国境線の絞り込み（データリポジトリ）

**Files:**
- Create: `/home/user/world-history-map-data/scripts/lib/boundary.ts`
- Test: `/home/user/world-history-map-data/scripts/lib/boundary.test.ts`

**Interfaces:**
- Produces:
  - `type LineGeometry = { type: "LineString"; coordinates: number[][] } | { type: "MultiLineString"; coordinates: number[][][] }`
  - `type NaturalEarthLine = { type: "Feature"; properties: Record<string, unknown>; geometry: LineGeometry | null }`
  - `type BoundaryFeature = { type: "Feature"; properties: { disputed: boolean }; geometry: LineGeometry }`
  - `selectLandBoundaries(features: readonly NaturalEarthLine[]): BoundaryFeature[]`
  - `selectDisputedAreaLines(features: readonly NaturalEarthLine[]): BoundaryFeature[]`
  - `toFeatureCollection(features: readonly BoundaryFeature[]): { type: "FeatureCollection"; features: BoundaryFeature[] }`

- [ ] **Step 1: 依存を入れる**

Run: `cd /home/user/world-history-map-data && pnpm install --frozen-lockfile`
Expected: 成功する

- [ ] **Step 2: 失敗するテストを書く**

`scripts/lib/boundary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  type LineGeometry,
  type NaturalEarthLine,
  selectDisputedAreaLines,
  selectLandBoundaries,
  toFeatureCollection,
} from "./boundary";

const geometry: LineGeometry = {
  type: "LineString",
  coordinates: [
    [60, 40],
    [61, 41],
  ],
};

function line(properties: Record<string, unknown>): NaturalEarthLine {
  return { type: "Feature", properties, geometry };
}

describe("selectLandBoundaries", () => {
  it("国際境界は実線（disputed が false）にし、属性は disputed だけにする", () => {
    expect(
      selectLandBoundaries([
        line({ FEATURECLA: "International boundary (verify)", FCLASS_JP: null, NAME: "x" }),
      ]),
    ).toEqual([{ type: "Feature", properties: { disputed: false }, geometry }]);
  });

  it("FCLASS_JP が空なら FEATURECLA に従う", () => {
    const result = selectLandBoundaries([
      line({ FEATURECLA: "Disputed (please verify)", FCLASS_JP: null }),
      line({ FEATURECLA: "Line of control (please verify)", FCLASS_JP: "" }),
      line({ FEATURECLA: "Indefinite (please verify)" }),
    ]);
    expect(result.map((feature) => feature.properties.disputed)).toEqual([true, true, true]);
  });

  it("FCLASS_JP があれば FEATURECLA より優先する", () => {
    const result = selectLandBoundaries([
      line({ FEATURECLA: "Disputed (please verify)", FCLASS_JP: "International boundary (verify)" }),
      line({ FEATURECLA: "Disputed (please verify)", FCLASS_JP: "Claim boundary" }),
    ]);
    expect(result.map((feature) => feature.properties.disputed)).toEqual([false, true]);
  });

  it("日本の立場で Unrecognized の線は除く", () => {
    expect(
      selectLandBoundaries([
        line({ FEATURECLA: "Line of control (please verify)", FCLASS_JP: "Unrecognized" }),
        line({ FEATURECLA: "Unrecognized", FCLASS_JP: null }),
      ]),
    ).toEqual([]);
  });

  it("国境ではない Overlay limit と Lease limit の線は除く", () => {
    expect(
      selectLandBoundaries([
        line({ FEATURECLA: "Overlay limit", FCLASS_JP: null }),
        line({ FEATURECLA: "Lease limit", FCLASS_JP: "International boundary (verify)" }),
      ]),
    ).toEqual([]);
  });

  it("geometry が無い線は除く", () => {
    expect(
      selectLandBoundaries([
        { type: "Feature", properties: { FEATURECLA: "International boundary (verify)" }, geometry: null },
      ]),
    ).toEqual([]);
  });
});

describe("selectDisputedAreaLines", () => {
  it("FCLASS_JP が明示された線だけを使う", () => {
    const result = selectDisputedAreaLines([
      line({ FEATURECLA: "Claim boundary", FCLASS_JP: null }),
      line({ FEATURECLA: "Claim boundary", FCLASS_JP: "" }),
      line({ FEATURECLA: "Breakaway", FCLASS_JP: "Unrecognized" }),
      line({ FEATURECLA: "Claim boundary", FCLASS_JP: "International boundary (verify)" }),
      line({ FEATURECLA: "Elusive frontier", FCLASS_JP: "Disputed (please verify)" }),
    ]);
    expect(result.map((feature) => feature.properties.disputed)).toEqual([false, true]);
  });
});

describe("toFeatureCollection", () => {
  it("FeatureCollection に包む", () => {
    const features = selectLandBoundaries([
      line({ FEATURECLA: "International boundary (verify)" }),
    ]);
    expect(toFeatureCollection(features)).toEqual({ type: "FeatureCollection", features });
  });
});
```

- [ ] **Step 3: 失敗することを確かめる**

Run: `pnpm test scripts/lib/boundary.test.ts`
Expected: FAIL（`./boundary` が見つからない）

- [ ] **Step 4: 実装する**

`scripts/lib/boundary.ts`:

```ts
// Natural Earth の国境線を日本の立場（FCLASS_JP）で絞り込み、係争線かどうかの属性だけを付ける
// FCLASS_JP が空の線は既定の種別（FEATURECLA）に従い、Unrecognized の線は描かない（Natural Earth の Quick Start と同じ扱い）

export type LineGeometry =
  | { type: "LineString"; coordinates: number[][] }
  | { type: "MultiLineString"; coordinates: number[][][] };

export type NaturalEarthLine = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: LineGeometry | null;
};

export type BoundaryFeature = {
  type: "Feature";
  properties: { disputed: boolean };
  geometry: LineGeometry;
};

// 国境ではない線（朝鮮半島の非武装地帯の縁・キプロスの緩衝地帯、バイコヌールの租借地）
const NOT_BOUNDARY = new Set(["Overlay limit", "Lease limit"]);
const UNRECOGNIZED = "Unrecognized";
const INTERNATIONAL = "International boundary";

function textOf(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

// 種別が国際境界なら実線、それ以外（係争・管理ライン・主張線・未確定など）は係争線にする
function toBoundary(feature: NaturalEarthLine, kind: string): BoundaryFeature[] {
  if (kind === UNRECOGNIZED || feature.geometry === null) {
    return [];
  }
  return [
    {
      type: "Feature",
      properties: { disputed: !kind.startsWith(INTERNATIONAL) },
      geometry: feature.geometry,
    },
  ];
}

// ne_*_admin_0_boundary_lines_land の線
export function selectLandBoundaries(features: readonly NaturalEarthLine[]): BoundaryFeature[] {
  return features.flatMap((feature) => {
    const base = textOf(feature.properties.FEATURECLA);
    if (base === null || NOT_BOUNDARY.has(base)) {
      return [];
    }
    return toBoundary(feature, textOf(feature.properties.FCLASS_JP) ?? base);
  });
}

// ne_*_admin_0_boundary_lines_disputed_areas の線。FCLASS_JP が空の線は他国の主張線なので使わない
export function selectDisputedAreaLines(features: readonly NaturalEarthLine[]): BoundaryFeature[] {
  return features.flatMap((feature) => {
    const kind = textOf(feature.properties.FCLASS_JP);
    return kind === null ? [] : toBoundary(feature, kind);
  });
}

export function toFeatureCollection(features: readonly BoundaryFeature[]): {
  type: "FeatureCollection";
  features: BoundaryFeature[];
} {
  return { type: "FeatureCollection", features: [...features] };
}
```

- [ ] **Step 5: テストが通ることを確かめる**

Run: `pnpm test scripts/lib/boundary.test.ts && pnpm lint && pnpm typecheck`
Expected: すべて PASS。Biome が整形を指摘したら `pnpm format` で直してから再実行する

- [ ] **Step 6: コミット**

```bash
cd /home/user/world-history-map-data
git add scripts/lib/boundary.ts scripts/lib/boundary.test.ts
git commit -m "Add Japan point-of-view boundary selection

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6"
```

---

### Task 2: ベースマップに boundary レイヤーを足す（データリポジトリ）

**Files:**
- Create: `/home/user/world-history-map-data/scripts/build-boundaries.ts`
- Modify: `/home/user/world-history-map-data/scripts/build-basemap.sh`
- Modify: `/home/user/world-history-map-data/scripts/lib/basemapCheck.ts`
- Modify: `/home/user/world-history-map-data/scripts/lib/basemapCheck.test.ts`
- Modify: `/home/user/world-history-map-data/scripts/verify-basemap.ts`
- Modify: `/home/user/world-history-map-data/CLAUDE.md`

**Interfaces:**
- Consumes: Task 1 の `selectLandBoundaries`・`selectDisputedAreaLines`・`toFeatureCollection`・`NaturalEarthLine`
- Produces: `dist/basemap.pmtiles` に `boundary` レイヤー（属性 `disputed`）。`BasemapFacts` に `layerFields: Record<string, readonly string[]>` を追加

- [ ] **Step 1: 検査の失敗するテストを書く**

`scripts/lib/basemapCheck.test.ts` の `valid` と「足りないソースレイヤー」のテストを直し、属性のテストを足す:

```ts
const valid: BasemapFacts = {
  minZoom: 0,
  maxZoom: EXPECTED_BASEMAP.maxZoom,
  tileType: 1,
  layerIds: ["land", "coastline", "boundary"],
  layerFields: { land: [], coastline: [], boundary: ["disputed"] },
  sizeBytes: 5 * 1024 * 1024,
};
```

```ts
  it("足りないソースレイヤーを指摘する", () => {
    expect(checkBasemap({ ...valid, layerIds: ["land", "boundary"] })).toEqual([
      "ソースレイヤー coastline がありません",
    ]);
  });

  it("国境線に disputed 属性が無ければ指摘する", () => {
    expect(
      checkBasemap({ ...valid, layerFields: { ...valid.layerFields, boundary: [] } }),
    ).toEqual(["ソースレイヤー boundary に属性 disputed がありません"]);
  });
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `pnpm test scripts/lib/basemapCheck.test.ts`
Expected: FAIL（`layerFields` の型エラーではなく、属性のテストが `[]` を返して失敗する。Vitest は型を見ないので実行はされる）

- [ ] **Step 3: 検査を実装する**

`scripts/lib/basemapCheck.ts` の `EXPECTED_BASEMAP` と `BasemapFacts` と `checkBasemap` を次のように直す:

```ts
export const EXPECTED_BASEMAP = {
  minZoom: 0,
  // 15 MiB を超えて 5 に下げたときは、build-basemap.sh も合わせて直す
  maxZoom: 6,
  layers: ["land", "coastline", "boundary"],
  // アプリのスタイルが前提にしている属性。落ちると係争線が実線で描かれてしまう
  fields: { boundary: ["disputed"] } as Record<string, readonly string[]>,
  maxBytes: 15 * 1024 * 1024,
} as const;
```

```ts
export type BasemapFacts = {
  minZoom: number;
  maxZoom: number;
  tileType: number;
  layerIds: string[];
  layerFields: Record<string, readonly string[]>;
  sizeBytes: number;
};
```

`checkBasemap` のソースレイヤーの `for` の直後に足す:

```ts
  for (const [layer, fields] of Object.entries(EXPECTED_BASEMAP.fields)) {
    if (!facts.layerIds.includes(layer)) {
      continue;
    }
    for (const field of fields) {
      if (!(facts.layerFields[layer] ?? []).includes(field)) {
        problems.push(`ソースレイヤー ${layer} に属性 ${field} がありません`);
      }
    }
  }
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `pnpm test scripts/lib/basemapCheck.test.ts`
Expected: PASS

- [ ] **Step 5: verify-basemap.ts で属性を読む**

`layerIdsOf` を次の `vectorLayersOf` に置き換える:

```ts
function vectorLayersOf(metadata: unknown): { id: string; fields: string[] }[] {
  if (typeof metadata !== "object" || metadata === null || !("vector_layers" in metadata)) {
    return [];
  }
  const layers = (metadata as { vector_layers: unknown }).vector_layers;
  if (!Array.isArray(layers)) {
    return [];
  }
  return layers.flatMap((layer: unknown) => {
    if (typeof layer !== "object" || layer === null) {
      return [];
    }
    const { id, fields } = layer as { id?: unknown; fields?: unknown };
    if (typeof id !== "string") {
      return [];
    }
    return [{ id, fields: typeof fields === "object" && fields !== null ? Object.keys(fields) : [] }];
  });
}
```

末尾の呼び出しを次のように直す:

```ts
const archive = new PMTiles(new NodeFileSource(path));
const header = await archive.getHeader();
const layers = vectorLayersOf(await archive.getMetadata());
const problems = checkBasemap({
  minZoom: header.minZoom,
  maxZoom: header.maxZoom,
  tileType: header.tileType,
  layerIds: layers.map((layer) => layer.id),
  layerFields: Object.fromEntries(layers.map((layer) => [layer.id, layer.fields])),
  sizeBytes: (await stat(path)).size,
});
```

- [ ] **Step 6: build-boundaries.ts を作る**

```ts
// Natural Earth の国境線を日本の立場で絞り込み、縮尺ごとに <出力先>/boundary_<縮尺>.geojson を書き出す
// build-basemap.sh から呼ぶ: tsx scripts/build-boundaries.ts <キャッシュのディレクトリ> <出力先>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type NaturalEarthLine,
  selectDisputedAreaLines,
  selectLandBoundaries,
  toFeatureCollection,
} from "./lib/boundary";

const [cacheDir, outDir] = process.argv.slice(2);
if (cacheDir === undefined || outDir === undefined) {
  throw new Error("使い方: tsx scripts/build-boundaries.ts <キャッシュのディレクトリ> <出力先>");
}

function readLines(dir: string, file: string): NaturalEarthLine[] {
  return (JSON.parse(readFileSync(join(dir, file), "utf8")) as { features: NaturalEarthLine[] })
    .features;
}

// 110m には係争地の線のファイルが無い
const SCALES = [
  { scale: "110m", disputedAreas: false },
  { scale: "50m", disputedAreas: true },
  { scale: "10m", disputedAreas: true },
] as const;

for (const { scale, disputedAreas } of SCALES) {
  const features = [
    ...selectLandBoundaries(readLines(cacheDir, `ne_${scale}_admin_0_boundary_lines_land.geojson`)),
    ...(disputedAreas
      ? selectDisputedAreaLines(
          readLines(cacheDir, `ne_${scale}_admin_0_boundary_lines_disputed_areas.geojson`),
        )
      : []),
  ];
  writeFileSync(join(outDir, `boundary_${scale}.geojson`), JSON.stringify(toFeatureCollection(features)));
  const disputed = features.filter((feature) => feature.properties.disputed).length;
  console.log(`国境線 ${scale}: ${features.length} 本（うち係争線 ${disputed} 本）`);
}
```

- [ ] **Step 7: build-basemap.sh を直す**

1 行目のコメントを `# Natural Earth の陸地・海岸線・国境線から dist/basemap.pmtiles を生成する` にする。

`SHA256` に 5 件を足す（値は Natural Earth v5.1.2 のファイルから計算済み）:

```bash
  [ne_110m_admin_0_boundary_lines_land.geojson]=d42479fd79552cca4eec7f85fcdca717a790d29ff06be7676f1af0568c6d3f7c
  [ne_50m_admin_0_boundary_lines_land.geojson]=2faac4f6b34386f3d21b6e018cf151f241f00e5c936d44dd17d7d9bfb147fa48
  [ne_10m_admin_0_boundary_lines_land.geojson]=74d9c16229c095fde65943a9919e337682f044bcebccb120764f38edf3b70f4a
  [ne_50m_admin_0_boundary_lines_disputed_areas.geojson]=5bf5312a293cf038a367c2f150d34f295a3ccd2704affca26a1bbb1bb95bb64e
  [ne_10m_admin_0_boundary_lines_disputed_areas.geojson]=69f19da764e6982b43aebae4b1a356ffe74c33f2a3cdb462637c0ba8e969c30b
```

`trap 'rm -rf "$tmp"' EXIT` の直後に足す:

```bash
# 国境線は日本の立場で絞り込み、係争線かどうかの属性（disputed）だけを付けてから使う
pnpm exec tsx scripts/build-boundaries.ts "$CACHE_DIR" "$tmp"
```

`build_scale` を次にする:

```bash
build_scale() {
  local scale="$1" minzoom="$2" maxzoom="$3"
  # 属性は国境線の disputed だけ残す（陸地・海岸線の属性は落ちる）
  tippecanoe -o "$tmp/$scale.pmtiles" --force --quiet \
    -Z"$minzoom" -z"$maxzoom" \
    -L "land:$CACHE_DIR/ne_${scale}_land.geojson" \
    -L "coastline:$CACHE_DIR/ne_${scale}_coastline.geojson" \
    -L "boundary:$tmp/boundary_${scale}.geojson" \
    -y disputed --no-tile-size-limit --no-feature-limit --detect-shared-borders
}
```

- [ ] **Step 8: CLAUDE.md を直す**

「守ること」の 2 つ目の箇条を次にする:

```markdown
- アプリは受け取った JSON のキーを厳密に検証し、知らないキーがあると読み込まない。またベースマップのソースレイヤー名（`land`・`coastline`・`boundary`）、`boundary` の属性 `disputed`、ズーム範囲はアプリのスタイルが前提にしている。成果物の形を変えるときはアプリ側の変更と合わせる
```

- [ ] **Step 9: 国境線の GeoJSON だけ手元で確かめる**

作業環境に tippecanoe は無い（ベースマップ全体は Step 12 で GitHub Actions が作る）。前処理だけ実行して本数を確かめる:

```bash
mkdir -p .basemap-cache /tmp/boundary-check
for f in ne_110m_admin_0_boundary_lines_land ne_50m_admin_0_boundary_lines_land ne_10m_admin_0_boundary_lines_land ne_50m_admin_0_boundary_lines_disputed_areas ne_10m_admin_0_boundary_lines_disputed_areas; do
  [ -f ".basemap-cache/$f.geojson" ] || curl -fsSL "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/$f.geojson" -o ".basemap-cache/$f.geojson"
done
sha256sum .basemap-cache/*boundary_lines*.geojson
pnpm exec tsx scripts/build-boundaries.ts .basemap-cache /tmp/boundary-check
```

Expected: sha256 が Step 7 の値と一致する。次の 3 行が出る（controller が Natural Earth v5.1.2 で同じ規則を実行して得た値）:

```
国境線 110m: 330 本（うち係争線 27 本）
国境線 50m: 391 本（うち係争線 31 本）
国境線 10m: 507 本（うち係争線 63 本）
```

- [ ] **Step 10: 全体の確認**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: すべて PASS

- [ ] **Step 11: コミットして push**

```bash
git add scripts/build-boundaries.ts scripts/build-basemap.sh scripts/lib/basemapCheck.ts scripts/lib/basemapCheck.test.ts scripts/verify-basemap.ts CLAUDE.md
git commit -m "Add modern country boundaries to the basemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6"
git push -u origin claude/eurasia-borders-display-8syuzu
```

- [ ] **Step 12: 一時ブランチの GitHub Actions でベースマップを作る**

作業ブランチ（`claude/eurasia-borders-display-8syuzu`）には一時ワークフローを入れない。一時ブランチ `claude/eurasia-borders-display-8syuzu-basemap` を作り、そこにだけ `.github/workflows/build-basemap.yml` を置く:

```bash
git switch -c claude/eurasia-borders-display-8syuzu-basemap
mkdir -p .github/workflows
cat > .github/workflows/build-basemap.yml <<'YAML'
# 一時ブランチ専用: nix devShell でベースマップを作り、dist/basemap.pmtiles をこのブランチにコミットする
name: Build basemap
on:
  push:
    branches: [claude/eurasia-borders-display-8syuzu-basemap]
permissions:
  contents: write
jobs:
  build:
    name: Build basemap
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: cachix/install-nix-action@13d8dd58da0234aa297dedd986986ccb8e7f3e24 # v31.11.1
      - name: Install dependencies
        run: nix develop -c pnpm install --frozen-lockfile
      - name: Build and verify basemap
        run: nix develop -c pnpm basemap:build
      - name: Commit basemap
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898099+github-actions[bot]@users.noreply.github.com"
          git add -f dist/basemap.pmtiles
          git commit -m "Build basemap"
          git push
YAML
git add .github/workflows/build-basemap.yml
git commit -m "Add temporary workflow to build the basemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6"
git push -u origin claude/eurasia-borders-display-8syuzu-basemap
git switch claude/eurasia-borders-display-8syuzu
```

push がワークフローの権限不足で拒否されたら BLOCKED として報告する。実行の完了は GitHub MCP の `actions_list`（リポジトリ `akihiro-tj/world-history-map-data`、ブランチ `claude/eurasia-borders-display-8syuzu-basemap`）で確かめる。`sleep` で待たない。

Expected: ワークフローが成功し、ログに「国境線 110m / 50m / 10m」の本数と `dist/basemap.pmtiles は条件を満たしています` が出る。一時ブランチに「Build basemap」のコミットが増える。失敗したらログ（`get_job_logs`）を読んで原因を報告する

---

### Task 3: 国境線のスタイルとベースマップの更新（アプリ）

**Files:**
- Modify: `/home/user/world-history-map/DESIGN.md`
- Regenerate: `/home/user/world-history-map/src/app/theme.css`
- Modify: `/home/user/world-history-map/src/map/style.ts`
- Test: `/home/user/world-history-map/src/map/style.test.ts`
- Update: `/home/user/world-history-map/public/data/basemap.pmtiles`

**Interfaces:**
- Consumes: Task 2 の `dist/basemap.pmtiles`（`boundary` レイヤー、属性 `disputed`）
- Produces: `MapColors.boundary: string`、CSS 変数 `--color-boundary`・`--text-caption`（Tailwind の `text-caption`）、レイヤー `boundary`・`boundary-disputed`

- [ ] **Step 1: 依存を入れ、GitHub Actions が作ったベースマップを取り込む**

```bash
cd /home/user/world-history-map && pnpm install --frozen-lockfile
cd /home/user/world-history-map-data
git fetch origin claude/eurasia-borders-display-8syuzu-basemap
git show origin/claude/eurasia-borders-display-8syuzu-basemap:dist/basemap.pmtiles > /home/user/world-history-map/public/data/basemap.pmtiles
pnpm exec tsx scripts/verify-basemap.ts /home/user/world-history-map/public/data/basemap.pmtiles
```

Expected: `... は条件を満たしています`。`public/data/basemap.pmtiles` が更新される（`git -C /home/user/world-history-map status` に出る）

取り込めたら一時ブランチを消す: `git push origin --delete claude/eurasia-borders-display-8syuzu-basemap`（このブランチは Task 2 で作った一時ブランチで、ほかに使っていない）

- [ ] **Step 2: DESIGN.md のトークンを足す**

front matter の `colors` の `coastline` の次に:

```yaml
  boundary: "#cfc8b8"
```

`typography` の `title` の次に:

```yaml
  caption:
    fontFamily: "system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
```

`components` の `map-coastline` の次に:

```yaml
  map-boundary:
    backgroundColor: "{colors.boundary}"
  boundary-note:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
```

本文を直す:

- Overview の「検索窓や選択パネルは地図を邪魔しない最小限の要素として重ねるにとどめ」を「検索窓・選択パネル・国境線の注記は地図を邪魔しない最小限の要素として重ねるにとどめ」にする
- Colors の「地図の色」の `coastline` の次に `  - \`boundary\`（#cfc8b8）: 現在の国境線。海岸線より弱い暖色の灰色にして、都市の点を邪魔しない。係争中の境界は同じ色の破線にする。` を足す
- Typography に `- \`caption\`: 地図の右下に出す国境線の注記に使う。` を足す
- Layout の最後に `- 国境線の注記は右下に置き、画面端との余白は \`spacing.sm\` を使う。スマートフォンで選択パネルを開いている間は隠す。` を足す
- Elevation & Depth の「検索窓・検索候補・選択パネル・エラー表示には」を「検索窓・検索候補・選択パネル・エラー表示・国境線の注記の説明には」にする
- Shapes に `- 国境線の注記: \`rounded.sm\`（ⓘ で開く説明は \`rounded.md\`）` を足す
- Components の `map-ocean` の行を「`map-ocean` / `map-land` / `map-coastline` / `map-boundary`: ベースマップの海・陸・海岸線・国境線の塗り。」にし、`- \`boundary-note\`: 地図の右下の国境線の注記。背景は \`surface\`、文字は \`muted\`、書体は \`caption\`。` を足す
- Do's and Don'ts の「UI 要素は検索窓と選択パネルだけにとどめる」を「UI 要素は検索窓・選択パネル・国境線の注記だけにとどめる」にする

- [ ] **Step 3: トークンを作り直して lint する**

Run: `pnpm tokens && pnpm exec design.md lint DESIGN.md && grep -E -- "--color-boundary|--text-caption" src/app/theme.css`
Expected: lint が通り、`--color-boundary: #cfc8b8;` と `--text-caption: 12px;` が出る

- [ ] **Step 4: スタイルの失敗するテストを書く**

`src/map/style.test.ts`:

- `colors` に `boundary: "#cfc8b8",` を足す（`coastline` の次）
- `readMapColors` の最初のテストの変数に `"--color-boundary": "#cfc8b8",` を足す
- レイヤー順のテストを次にする:

```ts
  it("海・陸・国境線・係争線・海岸線・都市・当たり判定の順に重ねる", () => {
    expect(style.layers.map((layer) => layer.id)).toEqual([
      "ocean",
      "land",
      "boundary",
      "boundary-disputed",
      "coastline",
      "cities",
      CITY_HIT_LAYER_ID,
    ]);
  });

  it("国境線は disputed で実線と破線に分け、disputed が無い線は実線で描く", () => {
    const layer = (id: string) => style.layers.find((candidate) => candidate.id === id);
    expect(layer("boundary")).toMatchObject({
      type: "line",
      source: "basemap",
      "source-layer": "boundary",
      filter: ["!=", ["get", "disputed"], true],
      paint: { "line-color": "#cfc8b8", "line-width": 0.6 },
    });
    expect(layer("boundary")).not.toHaveProperty("paint.line-dasharray");
    expect(layer("boundary-disputed")).toMatchObject({
      type: "line",
      source: "basemap",
      "source-layer": "boundary",
      filter: ["==", ["get", "disputed"], true],
      paint: { "line-color": "#cfc8b8", "line-width": 0.6, "line-dasharray": [5, 10 / 3] },
    });
  });
```

- [ ] **Step 5: 失敗することを確かめる**

Run: `pnpm test src/map/style.test.ts`
Expected: FAIL（`boundary` が読まれない・レイヤーが無い）

- [ ] **Step 6: 実装する**

`src/map/style.ts`:

- `MapColors` の `coastline` の次に `boundary: string;`
- `COLOR_VARIABLES` の `coastline` の次に `boundary: "--color-boundary",`
- `readMapColors` の戻り値の `coastline` の次に `boundary: read(COLOR_VARIABLES.boundary),`
- `layers` の `land` と `coastline` の間に:

```ts
      // 現在の国境線。係争線（disputed）は破線にする。disputed が無い線は実線で描く
      {
        id: "boundary",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "boundary",
        filter: ["!=", ["get", "disputed"], true],
        paint: { "line-color": colors.boundary, "line-width": 0.6 },
      },
      {
        id: "boundary-disputed",
        type: "line",
        source: BASEMAP_SOURCE_ID,
        "source-layer": "boundary",
        filter: ["==", ["get", "disputed"], true],
        paint: { "line-color": colors.boundary, "line-width": 0.6, "line-dasharray": [5, 10 / 3] },
      },
```

- [ ] **Step 7: テストが通ることを確かめる**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: すべて PASS

- [ ] **Step 8: コミット**

```bash
git add DESIGN.md src/app/theme.css src/map/style.ts src/map/style.test.ts public/data/basemap.pmtiles
git commit -m "Draw modern country boundaries on the map

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6"
```

---

### Task 4: 右下の注記（アプリ）

**Files:**
- Modify: `/home/user/world-history-map/src/app/copy.ts`
- Create: `/home/user/world-history-map/src/app/BoundaryNote.tsx`
- Modify: `/home/user/world-history-map/src/app/App.tsx`

**Interfaces:**
- Consumes: Task 3 の Tailwind クラス `text-caption`・`bg-surface`・`text-muted`・`text-primary`
- Produces: `BoundaryNote({ className?: string })`、`COPY.boundaryNote` ほか 5 つの文言、`NATURAL_EARTH_URL`

- [ ] **Step 1: 文言を足す**

`src/app/copy.ts` の `close: "閉じる",` の次に:

```ts
  boundaryNote: "※薄い線は現在の国境",
  boundaryNoteButton: "国境線について",
  // 「国境線は Natural Earth のデータを使っています。」の Natural Earth をリンクにするため 3 つに分ける
  boundarySourceLead: "国境線は ",
  naturalEarth: "Natural Earth",
  boundarySourceTail: " のデータを使っています。",
  boundaryDisputed:
    "係争中の境界は破線で示しています。どの境界を係争中とするかは、Natural Earth がまとめた日本の見解に従っています。",
```

ファイルの末尾に:

```ts

export const NATURAL_EARTH_URL = "https://www.naturalearthdata.com/";
```

- [ ] **Step 2: BoundaryNote を作る**

`src/app/BoundaryNote.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { COPY, NATURAL_EARTH_URL } from "./copy";

type BoundaryNoteProps = {
  className?: string;
};

// 地図の右下に出す国境線の注記。ⓘ で出典と係争地の扱いを開く
export function BoundaryNote({ className = "" }: BoundaryNoteProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 開いている間は、注記の外（地図や検索窓）に触れたら閉じる
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none absolute right-0 bottom-0 m-sm flex flex-col items-end gap-xs ${className}`}
    >
      {open && (
        <div className="pointer-events-auto max-w-72 rounded-md border border-border bg-surface px-md py-sm font-label text-caption text-muted shadow-md">
          <p>
            {COPY.boundarySourceLead}
            <a
              href={NATURAL_EARTH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {COPY.naturalEarth}
            </a>
            {COPY.boundarySourceTail}
          </p>
          <p className="mt-xs">{COPY.boundaryDisputed}</p>
        </div>
      )}
      <div className="pointer-events-auto flex items-center gap-xs rounded-sm bg-surface/85 pl-sm font-label text-caption text-muted">
        <span>{COPY.boundaryNote}</span>
        <button
          type="button"
          aria-label={COPY.boundaryNoteButton}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
          className="grid size-6 place-items-center rounded-full text-muted hover:bg-highlight aria-expanded:text-primary"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7.5v3.5M8 5v.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: App に置く**

`src/app/App.tsx`:

- import に `import { BoundaryNote } from "./BoundaryNote";` を足す（`./copy` の import の前、アルファベット順）
- `{selectedCity && <SelectionPanel ... />}` の直前に:

```tsx
      {/* スマートフォンでは選択パネル（下部）とぶつかるので、選択中は隠す */}
      <BoundaryNote className={selectedCity ? "max-md:hidden" : ""} />
```

- [ ] **Step 4: 静的な確認**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: すべて成功

- [ ] **Step 5: 実ブラウザで確かめる**

`run` スキルに従い `pnpm dev` を起動し、Chromium（`/opt/pw-browsers` の Playwright。`--use-angle=swiftshader --enable-unsafe-swiftshader` を付ける）で PC 幅（1280×800）と 375×667（`hasTouch: true`）を確かめる。Playwright はスクラッチパッドに `playwright-core` を入れて、`executablePath` に `/opt/pw-browsers/chromium-*/chrome-linux/chrome` を渡す。各項目でスクリーンショットを撮る。

1. 初期表示で国境線が海岸線より弱く見え、都市の点を邪魔しない。カザフスタン・ウズベキスタン・モンゴルなどの国境が見える
2. z2–3 と z4–6 に拡大しても国境線が出る。カシミール（例: 経度 77・緯度 35 付近を z5）で破線が出る
3. 右下に「※薄い線は現在の国境」と ⓘ が 1 行で出る（375px でも折り返さない）
4. ⓘ を押すと説明が開き、`aria-expanded` が `true` になる。もう一度押すと閉じる。開いた状態で地図に触れると閉じる。リンクを押しても閉じず、新しいタブで https://www.naturalearthdata.com/ が開く
5. 375px 幅で都市を選ぶと注記が隠れ、パネルを閉じると戻る。PC 幅では選択中も出ている

スクリーンショットはユーザーに送る。見た目の問題（色が薄すぎる・濃すぎるなど）があれば、値を変える前にユーザーに案を示す。

- [ ] **Step 6: コミットして push**

```bash
git add src/app/copy.ts src/app/BoundaryNote.tsx src/app/App.tsx
git commit -m "Add boundary note with source and dispute details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Hmz7jqwHSLtnm79okgg6W6"
git push -u origin claude/eurasia-borders-display-8syuzu
```
