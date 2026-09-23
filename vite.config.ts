import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { assetManifestDev } from "./vite/plugins/assetManifestDev";

export default defineConfig({
  plugins: [react(), tailwindcss(), assetManifestDev()],
});
