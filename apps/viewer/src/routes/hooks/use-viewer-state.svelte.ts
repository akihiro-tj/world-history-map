import type { Layer } from "@deck.gl/core";
import { GeoFeatureCategory } from "../../constants";
import type { GeoFeature } from "../types";
import { getBasinTileLayer } from "./layers/basin";
import { getDesertTileLayer } from "./layers/desert-tile";
import { getIslandGroupTileLayer } from "./layers/island-group";
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
				[GeoFeatureCategory.ISLAND_GROUP]: true,
				[GeoFeatureCategory.ISLAND]: true,
				[GeoFeatureCategory.PENINSULA]: true,
				[GeoFeatureCategory.BASIN]: true,
				[GeoFeatureCategory.DESERT]: true,
				[GeoFeatureCategory.PLATEAU]: true,
				[GeoFeatureCategory.MOUNTAIN]: true,
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
		getLandTileLayer(),
		getIslandGroupTileLayer(
			flattenedFilter[GeoFeatureCategory.ISLAND_GROUP],
			updateGeoFeature,
		),
		getIslandTileLayer(
			flattenedFilter[GeoFeatureCategory.ISLAND],
			updateGeoFeature,
		),
		getPeninsulaTileLayer(
			flattenedFilter[GeoFeatureCategory.PENINSULA],
			updateGeoFeature,
		),
		getBasinTileLayer(
			flattenedFilter[GeoFeatureCategory.BASIN],
			updateGeoFeature,
		),
		getDesertTileLayer(
			flattenedFilter[GeoFeatureCategory.DESERT],
			updateGeoFeature,
		),
		getPlateauTileLayer(
			flattenedFilter[GeoFeatureCategory.PLATEAU],
			updateGeoFeature,
		),
		getMountainTileLayer(
			flattenedFilter[GeoFeatureCategory.MOUNTAIN],
			updateGeoFeature,
		),
		getLakeTileLayer(
			flattenedFilter[GeoFeatureCategory.LAKE],
			updateGeoFeature,
		),
		getRiverTileLayer(
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
