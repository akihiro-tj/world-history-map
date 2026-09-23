// public/ のアセットをハッシュ付きキーで R2 に置き、dist/asset-manifest.json を書き出す
// --dry-run のときはアップロードせず manifest だけを書く
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { LOGICAL_ASSET_PATHS } from "../src/assets/logicalAssets";
import { contentTypeFor, hashedKey, IMMUTABLE_CACHE_CONTROL, R2_BUCKET } from "./lib/assetKeys";

const dryRun = process.argv.includes("--dry-run");
const manifest: Record<string, string> = {};

for (const logicalPath of LOGICAL_ASSET_PATHS) {
  const file = `public/${logicalPath}`;
  const key = hashedKey(logicalPath, readFileSync(file));
  if (!dryRun) {
    execFileSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "r2",
        "object",
        "put",
        `${R2_BUCKET}/${key}`,
        "--file",
        file,
        "--content-type",
        contentTypeFor(logicalPath),
        "--cache-control",
        IMMUTABLE_CACHE_CONTROL,
        "--remote",
      ],
      { stdio: "inherit" },
    );
  }
  manifest[logicalPath] = `/${key}`;
}

writeFileSync("dist/asset-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  dryRun
    ? "manifest だけを書き出しました"
    : "R2 へのアップロードと manifest の書き出しが完了しました",
);
