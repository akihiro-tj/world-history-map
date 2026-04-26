import { type HashedFilename, HashedTileFilename } from '@world-history-map/tiles';

export function extractHashedTileFilenames(keys: readonly string[]): readonly HashedFilename[] {
  return HashedTileFilename.parseAll(keys).map((tile) => tile.toString());
}
