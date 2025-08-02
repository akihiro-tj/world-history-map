import type { GeoFeature } from "@/routes/types";
import type { Color } from "@deck.gl/core";
import { ClipExtension } from "@deck.gl/extensions";
import {
	TileLayer,
	type TileLayer as TileLayerType,
} from "@deck.gl/geo-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import {
	COLOR_ISLAND_GROUP,
	FILL_OPACITY,
	ISLAND_GROUP_TILE_LAYER_ID,
	ISLAND_GROUP_TILE_SOURCE_URL,
} from "./constants";

export const getIslandGroupTileLayer = (
	isVisible: boolean,
	onClick: (geoFeature: GeoFeature) => void,
): TileLayerType => {
	const layerId = ISLAND_GROUP_TILE_LAYER_ID;
	const islandGroupTileSource = new PMTilesTileSource(
		ISLAND_GROUP_TILE_SOURCE_URL,
		{},
	);

	return new TileLayer({
		id: layerId,
		getTileData: islandGroupTileSource.getTileData,
		visible: isVisible,
		onClick: (info) => {
			const properties: GeoFeature = info.object.properties;
			onClick(properties);
		},
		renderSubLayers: (props) => {
			const bbox = props.tile.boundingBox;
			return new GeoJsonLayer({
				id: `${layerId}-${props.tile.id}`,
				data: props.data,
				extensions: [new ClipExtension()],
				clipBounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]],
				getFillColor: [...COLOR_ISLAND_GROUP, 255 * FILL_OPACITY] as Color,
				getLineColor: COLOR_ISLAND_GROUP,
				lineWidthMinPixels: 3,
				pickable: true,
			});
		},
	});
};
