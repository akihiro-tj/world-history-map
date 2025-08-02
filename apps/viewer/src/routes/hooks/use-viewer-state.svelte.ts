import type { Layer } from "@deck.gl/core";
import { GeoFeatureCategory } from "../../constants";
import type { GeoFeature } from "../types";
import {
	DESERT_TILE_LAYER_ID,
	DESERT_TILE_SOURCE_URL,
	ISLAND_GROUP_TILE_LAYER_ID,
	ISLAND_GROUP_TILE_SOURCE_URL,
	ISLAND_TILE_LAYER_ID,
	ISLAND_TILE_SOURCE_URL,
	LAKE_TILE_LAYER_ID,
	LAKE_TILE_SOURCE_URL,
	LAND_TILE_LAYER_ID,
	LAND_TILE_SOURCE_URL,
	MOUNTAIN_TILE_LAYER_ID,
	MOUNTAIN_TILE_SOURCE_URL,
	PENINSULA_TILE_LAYER_ID,
	PENINSULA_TILE_SOURCE_URL,
	PLATEAU_TILE_LAYER_ID,
	PLATEAU_TILE_SOURCE_URL,
	RIVER_TILE_LAYER_ID,
	RIVER_TILE_SOURCE_URL,
} from "./layers/constants";
import { getDesertTileLayer } from "./layers/desert-tile";
import { getIslandTileLayer } from "./layers/island-tile";
import { getLakeTileLayer } from "./layers/lake-tile";
import { getLandTileLayer } from "./layers/land-tile";
import { getMountainTileLayer } from "./layers/mountain-tile";
import { getPeninsulaTileLayer } from "./layers/peninsula-tile";
import { getPlateauTileLayer } from "./layers/plateau-tile";
import { getRiverTileLayer } from "./layers/river-tile";

interface ViewerState {
	isFilterPanelVisible: boolean;
	selectedGeoFeature: GeoFeature | null;
	filterGroups: FilterGroup[];
	layers: Layer[];
	showFilterPanel: () => void;
	hideFilterPanel: () => void;
	updateFilter: (category: GeoFeatureCategory, isVisible: boolean) => void;
	unselectGeoFeature: () => void;
}

interface FilterGroup {
	id: string;
	label: string;
	filter: Filter;
}

type Filter = Record<GeoFeatureCategory, boolean>;

export const useViewerState = (): ViewerState => {
	let isFilterPanelVisible = $state(
		typeof window !== "undefined" && window.innerWidth > 768,
	);
	let selectedGeoFeature = $state<GeoFeature | null>(null);

	const filterGroups = $state<FilterGroup[]>([
		{
			id: "terrain",
			label: "地形",
			filter: {
				[GeoFeatureCategory.MOUNTAIN]: true,
				[GeoFeatureCategory.PLATEAU]: true,
				[GeoFeatureCategory.DESERT]: true,
				[GeoFeatureCategory.ISLAND_GROUP]: true,
				[GeoFeatureCategory.ISLAND]: true,
				[GeoFeatureCategory.PENINSULA]: true,
				[GeoFeatureCategory.LAKE]: true,
				[GeoFeatureCategory.RIVER]: true,
			},
		},
	]);

	const flattenedFilter = $derived<Filter>(
		filterGroups.reduce(
			(acc, group) => Object.assign(acc, group.filter),
			{} as Filter,
		),
	);

	const updateGeoFeature = (geoFeature: GeoFeature) => {
		selectedGeoFeature = geoFeature;
		isFilterPanelVisible = false;
	};

	const layers = $derived<Layer[]>([
		getLandTileLayer(LAND_TILE_LAYER_ID, LAND_TILE_SOURCE_URL),
		getIslandTileLayer(
			ISLAND_GROUP_TILE_LAYER_ID,
			ISLAND_GROUP_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.ISLAND_GROUP],
			updateGeoFeature,
		),
		getIslandTileLayer(
			ISLAND_TILE_LAYER_ID,
			ISLAND_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.ISLAND],
			updateGeoFeature,
		),
		getPeninsulaTileLayer(
			PENINSULA_TILE_LAYER_ID,
			PENINSULA_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.PENINSULA],
			updateGeoFeature,
		),
		getDesertTileLayer(
			DESERT_TILE_LAYER_ID,
			DESERT_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.DESERT],
			updateGeoFeature,
		),
		getMountainTileLayer(
			MOUNTAIN_TILE_LAYER_ID,
			MOUNTAIN_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.MOUNTAIN],
			updateGeoFeature,
		),
		getPlateauTileLayer(
			PLATEAU_TILE_LAYER_ID,
			PLATEAU_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.PLATEAU],
			updateGeoFeature,
		),
		getLakeTileLayer(
			LAKE_TILE_LAYER_ID,
			LAKE_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.LAKE],
			updateGeoFeature,
		),
		getRiverTileLayer(
			RIVER_TILE_LAYER_ID,
			RIVER_TILE_SOURCE_URL,
			flattenedFilter[GeoFeatureCategory.RIVER],
			updateGeoFeature,
		),
	]);

	return {
		get isFilterPanelVisible(): boolean {
			return isFilterPanelVisible;
		},
		get selectedGeoFeature(): GeoFeature | null {
			return selectedGeoFeature;
		},
		get filterGroups(): FilterGroup[] {
			return filterGroups;
		},
		get layers(): Layer[] {
			return layers;
		},
		showFilterPanel: () => {
			isFilterPanelVisible = true;
			selectedGeoFeature = null;
		},
		hideFilterPanel: () => {
			isFilterPanelVisible = false;
		},
		updateFilter: (category: GeoFeatureCategory, isVisible: boolean) => {
			const targetFilterGroup = filterGroups.find((group) =>
				Object.keys(group.filter).some((key) => key === category),
			);
			if (!targetFilterGroup) {
				return;
			}
			const targetFilter = targetFilterGroup.filter;
			targetFilter[category] = isVisible;
		},
		unselectGeoFeature: () => {
			selectedGeoFeature = null;
		},
	};
};
