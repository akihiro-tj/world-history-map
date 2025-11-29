# Research: インタラクティブ世界史地図

**Date**: 2025-11-29
**Feature**: 001-interactive-history-map

## 1. 地図ライブラリ選定

### Decision: MapLibre GL JS (react-map-gl)

### Rationale

1. **ベクタータイル描画性能**: WebGLベースのGPU加速レンダリングで、PMTiles/MVT形式のベクタータイルを高速描画可能
2. **ラベル表示**: ベクタータイル技術による動的なラベル配置とコリジョン検出
3. **パフォーマンス**: 60fps維持のための最適化オプションが豊富
4. **TypeScriptサポート**: MapLibre GL JS自体がTypeScriptで実装、react-map-gl v8は完全な型定義を提供
5. **アクセシビリティ**: キーボードナビゲーション標準搭載、WCAG 2.1評価済み

### Alternatives Considered

| ライブラリ | 長所 | 短所 | 却下理由 |
|-----------|------|------|----------|
| Leaflet (react-leaflet) | 学習コスト低、軽量(42kB) | DOM操作ベースで大量データに弱い | 50年代×多数の領土ポリゴンでパフォーマンス懸念 |
| OpenLayers | 高機能、GIS向け | 学習コスト高、バンドルサイズ大 | 今回の要件には過剰 |
| deck.gl | 大規模データ可視化に特化 | 地図UIが限定的 | 地図ライブラリではなくレイヤーライブラリ |

### Implementation Notes

```bash
pnpm add react-map-gl maplibre-gl
```

- `react-map-gl/maplibre` エンドポイントを使用
- PMTilesプロトコルを登録してベクタータイルを配信
- 地図スタイルはシンプルなベースマップを使用（領土の色分けを目立たせるため）

## 2. historical-basemaps データ分析

### Decision: PMTiles形式に変換して配信、index.jsonでメタデータ管理

### Rationale

- データは約50年代分（紀元前123,000年〜2010年）
- GeoJSONのままでは各年代数MB〜数十MBになり初期ロードが重い
- PMTiles形式に変換することで約90%のサイズ削減が可能
- タイル単位の部分ロードにより、ズームレベルに応じた最適なデータ配信
- Cloudflare Pages等の静的ホスティングでそのまま配信可能

### PMTiles変換

```bash
# Tippecanoe (Felt fork) を使用してGeoJSONからPMTilesを生成
tippecanoe -o territories-1650.pmtiles -z10 -Z0 --drop-densest-as-needed world_1650.geojson
```

### Data Structure

```typescript
// index.json の構造
interface YearIndex {
  years: Array<{
    year: number;        // 年代（負の値は紀元前）
    filename: string;    // PMTilesファイル名
    countries: string[]; // その時代の国・地域名
  }>;
}

// PMTiles内のベクタータイル属性（MVT形式）
interface TerritoryProperties {
  NAME: string;           // 国・地域名（ラベル用）
  SUBJECTO: string;       // 植民地権力や地域名（色分け用）
  PARTOF: string;         // より大きな文化圏への帰属
  BORDERPRECISION: 1 | 2 | 3; // 境界精度
}
```

### MapLibre + PMTiles Integration

```typescript
// App.tsx または main.tsx でプロトコルを登録
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

useEffect(() => {
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  return () => {
    maplibregl.removeProtocol("pmtiles");
  };
}, []);

// スタイルでPMTilesソースを指定
const style = {
  sources: {
    territories: {
      type: "vector",
      url: "pmtiles://https://example.com/territories-1650.pmtiles"
    }
  }
};
```

### Available Years

データは以下の年代で利用可能（主要なもの）:

**紀元前**: -123000, -10000, -8000, -5000, -4000, -3000, -2000, -1500, -1000, -700, -500, -400, -300, -200, -100, -1

**紀元後**: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, **1650**, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010

**注意**: 仕様では1648年をデフォルトとしていたが、データは1650年が最も近い。1650年をデフォルトとする。

### License

GPL-3.0ライセンス。帰属表示とライセンス表記が必要。

## 3. 領土説明コンテンツ生成

### Decision: ビルド時にAI生成、静的JSONとして配置

### Rationale

1. **ランタイムAPI呼び出し不要**: コスト削減、レイテンシ回避
2. **レビュー可能**: 生成コンテンツをコミット前に確認可能
3. **段階的拡充**: 主要な領土から順次追加

### Content Structure

```typescript
interface TerritoryDescription {
  id: string;           // 領土識別子（NAME + 年代）
  name: string;         // 領土名（日本語）
  year: number;         // 年代
  summary: string;      // 概要（1-2文）
  background: string;   // 時代背景
  keyEvents: string[];  // 主要な出来事
  relatedYears: number[]; // 関連する年代（リンク用）
  generatedAt: string;  // 生成日時
  aiGenerated: true;    // AI生成フラグ（常にtrue）
}
```

### Generation Strategy

1. 初期リリース: 1650年の主要10-20領土のみ
2. 以降: 年代・領土を段階的に追加

## 4. 年代選択UI

### Decision: 横スクロール可能なボタンリスト、選択中を中央に強調表示

### Rationale

- データの年代間隔が不均等のため、スライダーは不適切
- ボタンリストなら存在する年代のみ表示でき、直感的

### Implementation Approach

```typescript
// 年代ボタンの表示
// 選択中の年代を中央にスクロール
// 選択中のボタンを視覚的に強調（サイズ、色、ボーダー）
// キーボード操作（←→キー）でナビゲーション可能
```

## 5. アクセシビリティ対応

### Decision: WCAG 2.1 AA準拠を目標

### Key Requirements

1. **キーボード操作**: 全機能がキーボードで操作可能
2. **スクリーンリーダー**: 地図上の領土にaria-label、情報パネルにlive region
3. **色覚配慮**: 領土の色分けは色だけでなくパターンやラベルでも区別可能
4. **フォーカス管理**: 年代変更時のフォーカス位置を適切に管理

### Testing Approach

- axe-coreによる自動チェック（Playwrightテストに統合）
- 手動キーボード操作テスト

## 6. パフォーマンス最適化

### Decision: PMTiles + タイルベース配信

### Strategies

1. **PMTilesによるタイル配信**: ズームレベルに応じた最適なデータのみロード
2. **プリフェッチ**: 隣接する年代のPMTilesを事前にロード
3. **Tippecanoeによる最適化**: `--drop-densest-as-needed`で低ズーム時のデータ量を自動調整
4. **レンダリング最適化**: MapLibreのベクタータイルレンダリング、レイヤー数の最小化

### Performance Targets

| メトリクス | 目標 | 測定方法 |
|-----------|------|----------|
| 初期表示 | 3秒以内 | Lighthouse |
| 地図操作 | 60fps | Chrome DevTools |
| 年代切替 | 2秒以内 | ユーザー操作からレンダリング完了まで |
| 領土クリック→表示 | 1秒以内 | クリックからパネル表示まで |

## 7. ビルド・デプロイ

### Decision: Vite + Cloudflare Pages

### Rationale

- Viteは高速なHMRとビルド
- Cloudflare Pagesは無制限帯域幅で大量のPMTilesデータ配信に最適
- グローバルCDN（200+拠点）で高速配信
- バックエンド不要でインフラコスト最小化

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl', 'react-map-gl'],
        },
      },
    },
  },
});
```
