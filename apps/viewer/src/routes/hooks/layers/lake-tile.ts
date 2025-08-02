import { TileLayer } from "@deck.gl/geo-layers";
import type { TileLayer as TileLayerType } from "@deck.gl/geo-layers";
import { COLOR_BACKGROUND } from "./constants";
import { PMTilesTileSource } from "@loaders.gl/pmtiles";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ClipExtension } from "@deck.gl/extensions";

export const getLakeTileLayer = (
	layerId: string,
	tileSourceUrl: string,
): TileLayerType => {
	const lakeTileSource = new PMTilesTileSource(tileSourceUrl, {});

	return new TileLayer({
		id: layerId,
		getTileData: lakeTileSource.getTileData,
		renderSubLayers: (props) => {
			const bbox = props.tile.boundingBox;
			return new GeoJsonLayer({
				id: `${layerId}-${props.tile.id}`,
				data: props.data,
				extensions: [new ClipExtension()],
				clipBounds: [bbox[0][0], bbox[0][1], bbox[1][0], bbox[1][1]],
				getFillColor: COLOR_BACKGROUND,
			});
		},
	});
};
