import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import {
	COLOR_BACKGROUND,
	LAKE_TILE_LAYER_ID,
	LAKE_TILE_SOURCE_URL,
} from "./constants";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ClipExtension } from "@deck.gl/extensions";

export const getLakeTileLayer = (): TileLayerType => {
	const lakeTileSource = new PMTilesTileSource(LAKE_TILE_SOURCE_URL, {});

	return new TileLayer({
		id: LAKE_TILE_LAYER_ID,
		getTileData: lakeTileSource.getTileData,
		renderSubLayers: (props) => {
			const bbox = props.tile.boundingBox;
			return new GeoJsonLayer({
				id: `${LAKE_TILE_LAYER_ID}-${props.tile.id}`,
				data: props.data,
				extensions: [new ClipExtension()],
				clipBounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]],
				getFillColor: COLOR_BACKGROUND,
			});
		},
	});
};
