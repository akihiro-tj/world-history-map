import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { assetManifestDev } from "./vite/plugins/assetManifestDev";
import { copyMaplibreWorker } from "./vite/plugins/copyMaplibreWorker";

export default defineConfig({
  plugins: [react(), tailwindcss(), assetManifestDev(), copyMaplibreWorker()],
  // 除外しないと dep 最適化が maplibre-gl-worker.mjs を見失い、
  // dev でワーカーが "Worker failed to load" になる（実機で再現・確認済み）
  optimizeDeps: { exclude: ["maplibre-gl"] },
});
