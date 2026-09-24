// 開発サーバーと vite preview で、ローカルパスを指す asset-manifest.json を返す
// public/ の原本を Vite がそのまま配信するので、R2 なしで動く
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { LOGICAL_ASSET_PATHS } from "../../src/assets/logicalAssets";
import type { AssetManifest } from "../../src/assets/manifest";

export function devManifest(): AssetManifest {
  return Object.fromEntries(LOGICAL_ASSET_PATHS.map((path) => [path, `/${path}`]));
}

export function handleManifestRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  if (req.url?.split("?")[0] !== "/asset-manifest.json") {
    next();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.end(JSON.stringify(devManifest()));
}

export function assetManifestDev(): Plugin {
  return {
    name: "asset-manifest-dev",
    configureServer(server) {
      server.middlewares.use(handleManifestRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleManifestRequest);
    },
  };
}
