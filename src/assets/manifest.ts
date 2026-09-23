// asset-manifest.json（論理名 → ハッシュ付きパス）の取得と解決

export type AssetManifest = Readonly<Record<string, string>>;

export function parseManifest(value: unknown): AssetManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("asset-manifest.json の形式が不正です");
  }
  const entries = Object.entries(value);
  for (const [logicalPath, path] of entries) {
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw new Error(`asset-manifest.json の ${logicalPath} が不正です`);
    }
  }
  return Object.fromEntries(entries) as AssetManifest;
}

export function resolveAssetUrl(
  manifest: AssetManifest,
  logicalPath: string,
  origin: string,
): string {
  const path = manifest[logicalPath];
  if (path === undefined) {
    throw new Error(`asset-manifest.json に ${logicalPath} がありません`);
  }
  return new URL(path, origin).href;
}

export async function fetchManifest(fetchFn: typeof fetch): Promise<AssetManifest> {
  const response = await fetchFn("/asset-manifest.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`asset-manifest.json の取得に失敗しました（${response.status}）`);
  }
  return parseManifest(await response.json());
}
