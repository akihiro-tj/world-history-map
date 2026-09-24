// maplibre-gl のワーカーは `./maplibre-gl-shared.mjs` を相対 import するため、
// Vite の `?url` では中身までは解析されず、本番ビルドに同梱されない。
// ワーカーと共有チャンクを、同じ相対名のまま assets/maplibre-gl-<version>/ に書き出す。
// バージョン付きディレクトリにすることで、maplibre-gl を更新したときに
// キャッシュされた古いワーカーが新しい本体と混ざるのを防ぐ。
// バージョンは maplibre-gl の package.json から読む（src/map/MapView.tsx 側は
// 実行時に maplibre-gl の getVersion() を読んで同じ文字列にする。どちらもインストール
// 済みパッケージ自身が唯一の情報源で、バージョン文字列をハードコードしない）。
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

export function copyMaplibreWorker(): Plugin {
  return {
    name: "copy-maplibre-worker",
    apply: "build",
    generateBundle() {
      const packageJsonPath = require.resolve("maplibre-gl/package.json");
      const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };
      const workerPath = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
      const sharedPath = require.resolve("maplibre-gl/dist/maplibre-gl-shared.mjs");
      this.emitFile({
        type: "asset",
        fileName: `assets/maplibre-gl-${version}/maplibre-gl-worker.mjs`,
        source: readFileSync(workerPath, "utf8"),
      });
      this.emitFile({
        type: "asset",
        fileName: `assets/maplibre-gl-${version}/maplibre-gl-shared.mjs`,
        source: readFileSync(sharedPath, "utf8"),
      });
    },
  };
}
