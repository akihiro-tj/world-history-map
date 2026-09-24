import { createHash } from "node:crypto";

// wrangler.jsonc の r2_buckets と同じ名前にする（テストで一致を確認している）
export const R2_BUCKET = "whm-assets";
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES: Record<string, string> = {
  pmtiles: "application/vnd.pmtiles",
  json: "application/json; charset=utf-8",
};

function splitExtension(logicalPath: string): { stem: string; ext: string } {
  const dot = logicalPath.lastIndexOf(".");
  if (dot <= logicalPath.lastIndexOf("/")) {
    throw new Error(`拡張子がありません: ${logicalPath}`);
  }
  return { stem: logicalPath.slice(0, dot), ext: logicalPath.slice(dot + 1) };
}

export function hashedKey(logicalPath: string, content: Uint8Array): string {
  const { stem, ext } = splitExtension(logicalPath);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `${stem}.${hash}.${ext}`;
}

export function contentTypeFor(logicalPath: string): string {
  const { ext } = splitExtension(logicalPath);
  const type = CONTENT_TYPES[ext];
  if (type === undefined) {
    throw new Error(`Content-Type が未定義の拡張子です: ${ext}`);
  }
  return type;
}
