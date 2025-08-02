import { ClipExtension } from "@deck.gl/extensions";
import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { COLOR_FOREGROUND, LAND_TILE_LAYER_ID } from "./constants";
import { LAND_TILE_SOURCE_URL } from "./constants";

export const getLandTileLayer = (): TileLayerType => {
	const landTileSource = new PMTilesTileSource(LAND_TILE_SOURCE_URL, {});

	return new TileLayer({
		id: LAND_TILE_LAYER_ID,
		getTileData: landTileSource.getTileData,
		renderSubLayers: (props) => {
			const bbox = props.tile.boundingBox;
			return new GeoJsonLayer({
				id: `${LAND_TILE_LAYER_ID}-${props.tile.id}`,
				data: props.data,
				extensions: [new ClipExtension()],
				clipBounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]],
				getFillColor: COLOR_FOREGROUND,
			});
		},
	});
};
