/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PMTiles base URL (Cloudflare Worker URL for production) */
  readonly VITE_TILES_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'maplibre-gl/dist/maplibre-gl.css' {
  const content: string;
  export default content;
}
