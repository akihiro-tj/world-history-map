// maplibre-gl のワーカーは `./maplibre-gl-shared.mjs` を相対 import するため、
// Vite の `?url` では中身までは解析されず、本番ビルドに同梱されない。
// ワーカーと共有チャンクを、同じ相対名のまま assets/ にそのまま書き出す。
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

export function copyMaplibreWorker(): Plugin {
  return {
    name: "copy-maplibre-worker",
    apply: "build",
    generateBundle() {
      const workerPath = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
      const sharedPath = require.resolve("maplibre-gl/dist/maplibre-gl-shared.mjs");
      this.emitFile({
        type: "asset",
        fileName: "assets/maplibre-gl-worker.mjs",
        source: readFileSync(workerPath, "utf8"),
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/maplibre-gl-shared.mjs",
        source: readFileSync(sharedPath, "utf8"),
      });
    },
  };
}
