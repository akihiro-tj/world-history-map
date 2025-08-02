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
	COLOR_MOUNTAIN,
	FILL_OPACITY,
	MOUNTAIN_TILE_LAYER_ID,
	MOUNTAIN_TILE_SOURCE_URL,
} from "./constants";

export const getMountainTileLayer = (
	isVisible: boolean,
	onClick: (geoFeature: GeoFeature) => void,
): TileLayerType => {
	const layerId = MOUNTAIN_TILE_LAYER_ID;
	const mountainTileSource = new PMTilesTileSource(
		MOUNTAIN_TILE_SOURCE_URL,
		{},
	);

	return new TileLayer({
		id: layerId,
		getTileData: mountainTileSource.getTileData,
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
				getFillColor: [...COLOR_MOUNTAIN, 255 * FILL_OPACITY] as Color,
				getLineColor: COLOR_MOUNTAIN,
				lineWidthMinPixels: 3,
				pickable: true,
			});
		},
	});
};
