# Quickstart: Camera Fit on Territory Select

**Feature**: 004-camera-fit-on-territory-select  
**Date**: 2026-05-10  
**Linked plan**: [plan.md](./plan.md) / [research.md](./research.md) / [data-model.md](./data-model.md) / [contracts/territory-feature-bbox.md](./contracts/territory-feature-bbox.md)

本ドキュメントは、ローカル開発環境で本機能の挙動を確認するまでの最短手順をまとめる。Phase 2 の `tasks.md` 生成・実装フェーズで、テストと実装の足場として参照する。

---

## 1. 前提

- リポジトリのセットアップが済んでいること（`pnpm install` 実行済み）
- Tippecanoe が利用可能（pipeline でタイル生成に必要。既存セットアップ通り）
- 本ブランチ `004-camera-fit-on-territory-select` をチェックアウト済み

---

## 2. タイル再ビルド

本機能では `apps/pipeline/src/tiles/merge.ts` を改修して Feature プロパティに bbox を追加するため、タイルの再生成が必要。

代表年（例: 1600 年）で動作確認するなら：

```bash
pnpm pipeline run --year 1600
```

全年代を再生成する場合：

```bash
pnpm pipeline run
```

成果物：
- `apps/pipeline/.cache/merged/world_<year>_merged.geojson`：bbox プロパティを含む中間 GeoJSON
- `packages/tiles/src/world_<year>.<hash>.pmtiles`：再ハッシュされた PMTiles

`packages/tiles` の `manifest.ts` 自動更新は `pnpm --filter @world-history-map/tiles run build` で行われ、後述の `pnpm dev` の `predev` でも自動実行される。

---

## 3. 開発サーバーの起動

```bash
pnpm dev
```

`predev` で `@world-history-map/tiles` のビルドが走り、`packages/tiles/dist/` の PMTiles が `/pmtiles/world_{year}.{hash}.pmtiles` で配信される。

---

## 4. テスト確認

実装より先に以下のテストを書き、failing 状態であることを確認してから実装に着手する：

| Test | 対象 | 観点 |
|------|------|------|
| `apps/pipeline/src/tiles/merge.test.ts`（既存改修） | `mergeByName` の bbox 出力 | 通常領土・飛び地（最大ポリゴン優先）・antimeridian またぎの 3 ケースで `BBOX_W/S/E/N/AM` が契約通り出力されること |
| `apps/frontend/src/domain/territory/territory-bounds.test.ts` | `parseFeatureBounds` 純関数 | 正常系・欠損プロパティ・型不正・antimeridian フラグの透過 |
| `apps/frontend/src/components/map/hooks/use-panel-padding.test.tsx` | `usePanelPadding` | Desktop / Mobile / リサイズ追随 / BottomSheet snap 変化を無視 |
| `apps/frontend/src/components/map/hooks/use-camera-fit-on-selection.test.tsx` | `useCameraFitOnSelection` | 新規選択で fitBounds 呼出 / 解除で非呼出 / selectedYear 変化での再フィット / source 未読込からの再試行 / reduced-motion で duration=0 |
| `apps/frontend/src/components/map/map-view.test.tsx`（既存改修可能性） | hook 統合 | 既存テストが regress しないこと |

実行：

```bash
pnpm --filter @world-history-map/pipeline run test
pnpm --filter @world-history-map/frontend run test
```

---

## 5. 動作確認シナリオ

ブラウザで `http://localhost:5173` を開き、以下のシナリオを順に試す。

### 5.1 Desktop（幅 1024px 以上）

1. **小さな領土の選択**
   - 1500 年 → 地中海周辺をズームイン → ヴェネツィア共和国をクリック
   - 期待：選択直後にカメラが移動し、領土がパネル右側の可視領域中央付近に収まる。ズームは `MAX_FIT_ZOOM = 5` で頭打ちになる
2. **左側に位置する領土の選択**
   - 1600 年 → フランス王国をクリック
   - 期待：パネルの背後に隠れず、可視領域内にハイライトが完全表示される
3. **大領土の選択**
   - 1300 年 → モンゴル帝国をクリック
   - 期待：領土の主要部分が padding 込みで収まる。`minZoom = 1` まで引いても入りきらない場合は `minZoom` でクランプされる
4. **飛び地を持つ領土の選択** ⭐本機能の重要ケース⭐
   - 1900 年 → アメリカ合衆国をクリック
   - 期待：北米本土にフィットし、アラスカやハワイを含めるための地球規模ズームアウトが発生しない
   - 同年 → 大英帝国（イギリス本土）をクリック
   - 期待：グレートブリテン島にフィットし、海外領土（カナダ・インド等）を含めない
5. **antimeridian 越えの選択**
   - 1900 年 → ロシア帝国をクリック
   - 期待：太平洋側にまたぐ領域も含めて 1 つの矩形として収まる。地球の裏側へジャンプしない
6. **連続選択**
   - フランス → ロシア → 中国を素早く連続クリック
   - 期待：最終的に中国に収束。途中の領土でアニメーションが止まらない
7. **パネルを閉じる**
   - 任意の領土を選択した後、パネル右上の閉じるボタンをクリック
   - 期待：カメラの中心・ズームは閉じる直前の値のまま

### 5.2 Mobile（DevTools の Responsive モード、幅 < 768px）

1. **南半球の領土の選択**
   - 1900 年 → オーストラリアをタップ
   - 期待：BottomSheet（half snap）の上の領域に領土が中央寄せ
2. **BottomSheet の高さ変更**
   - オーストラリアを選択した後、シートを expanded まで引き上げる
   - 期待：シート高さの変化ではカメラは動かない（FR-010）
3. **南米南部の選択**
   - 1820 年 → アルゼンチンをタップ
   - 期待：BottomSheet 上の領域に収まる

### 5.3 prefers-reduced-motion

1. macOS：システム設定 → アクセシビリティ → 表示 → 「視差効果を減らす」を ON
2. ブラウザをリロードし、任意の領土を選択
3. 期待：アニメーションなしで即座にジャンプ。最終位置は通常時と同一

---

## 6. Quality Gates

PR 作成前に以下を必ず通す：

```bash
pnpm test && pnpm check && pnpm typecheck
```

- `pnpm check`：Biome の format + lint
- `pnpm typecheck`：TS の型検査（複数 workspace 横断）

---

## 7. 性能・a11y チェック

- **SC-003**（800ms 以内）：DevTools Performance パネルで「クリック → animation end」をチェック。`duration: 600` を渡しているため通常はクリア
- **prefers-reduced-motion**：上記 5.3 の手順
- **キーボード操作**：`Tab` で `SummaryNavStrip` などにフォーカスを移し、領土を選んでもカメラフィットが動くこと（FR-006）
- **regression**：既存の領土クリック・パネル開閉・年代切替のいずれもブロックされないこと
