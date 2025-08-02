import type { GeoFeature } from "@/routes/types";
import type { Color } from "@deck.gl/core";
import { ClipExtension } from "@deck.gl/extensions";
import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { COLOR_LAKE, FILL_OPACITY } from "./constants";

export const getLakeTileLayer = (
	layerId: string,
	tileSourceUrl: string,
	isVisible: boolean,
	onClick: (geoFeature: GeoFeature) => void,
): TileLayerType => {
	const lakeTileSource = new PMTilesTileSource(tileSourceUrl, {});

	return new TileLayer({
		id: layerId,
		getTileData: lakeTileSource.getTileData,
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
				getFillColor: [...COLOR_LAKE, 255 * FILL_OPACITY] as Color,
				getLineColor: COLOR_LAKE,
				lineWidthMinPixels: 3,
				pickable: true,
			});
		},
	});
};
