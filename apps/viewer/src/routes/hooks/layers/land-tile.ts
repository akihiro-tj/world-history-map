import { ClipExtension } from "@deck.gl/extensions";
import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { COLOR_FOREGROUND } from "./constants";

export const getLandTileLayer = (
	layerId: string,
	tileSourceUrl: string,
): TileLayerType => {
	const landTileSource = new PMTilesTileSource(tileSourceUrl, {});

	return new TileLayer({
		id: layerId,
		getTileData: landTileSource.getTileData,
		renderSubLayers: (props) => {
			const bbox = props.tile.boundingBox;
			return new GeoJsonLayer({
				id: `${layerId}-${props.tile.id}`,
				data: props.data,
				extensions: [new ClipExtension()],
				clipBounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]],
				getFillColor: COLOR_FOREGROUND,
			});
		},
	});
};
