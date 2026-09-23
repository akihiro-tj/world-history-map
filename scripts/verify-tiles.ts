// world.pmtiles のヘッダーとメタデータを読み、checkTiles の条件を満たすか調べる
import { open, stat } from "node:fs/promises";
import { PMTiles, type RangeResponse, type Source } from "pmtiles";
import { checkTiles } from "./lib/tilesCheck";

class NodeFileSource implements Source {
  constructor(private readonly path: string) {}

  getKey(): string {
    return this.path;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const handle = await open(this.path);
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, offset);
      const data = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + bytesRead,
      ) as ArrayBuffer;
      return { data };
    } finally {
      await handle.close();
    }
  }
}

function layerIdsOf(metadata: unknown): string[] {
  if (typeof metadata !== "object" || metadata === null || !("vector_layers" in metadata)) {
    return [];
  }
  const layers = (metadata as { vector_layers: unknown }).vector_layers;
  if (!Array.isArray(layers)) {
    return [];
  }
  return layers.flatMap((layer: unknown) => {
    const id =
      typeof layer === "object" && layer !== null ? (layer as { id?: unknown }).id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}

const path = process.argv[2];
if (path === undefined) {
  throw new Error("使い方: tsx scripts/verify-tiles.ts <pmtiles のパス>");
}
const archive = new PMTiles(new NodeFileSource(path));
const header = await archive.getHeader();
const problems = checkTiles({
  minZoom: header.minZoom,
  maxZoom: header.maxZoom,
  tileType: header.tileType,
  layerIds: layerIdsOf(await archive.getMetadata()),
  sizeBytes: (await stat(path)).size,
});
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`${path} は条件を満たしています`);
