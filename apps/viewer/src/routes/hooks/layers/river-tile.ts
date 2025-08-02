import type { GeoFeature } from "@/routes/types";
import { ClipExtension } from "@deck.gl/extensions";
import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { COLOR_RIVER } from "./constants";

export const getRiverTileLayer = (
	layerId: string,
	tileSourceUrl: string,
	isVisible: boolean,
	onClick: (geoFeature: GeoFeature) => void,
): TileLayerType => {
	const riverTileSource = new PMTilesTileSource(tileSourceUrl, {});

	return new TileLayer({
		id: layerId,
		getTileData: riverTileSource.getTileData,
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
				getLineColor: COLOR_RIVER,
				lineWidthMinPixels: 2,
				pickable: true,
			});
		},
	});
};
