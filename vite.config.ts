import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { assetManifestDev } from "./vite/plugins/assetManifestDev";
import { copyMaplibreWorker } from "./vite/plugins/copyMaplibreWorker";

export default defineConfig({
  plugins: [react(), tailwindcss(), assetManifestDev(), copyMaplibreWorker()],
  // maplibre-gl のワーカーは dep 最適化と相性が悪く、除外しないと dev で読み込みに失敗する
  optimizeDeps: { exclude: ["maplibre-gl"] },
});
