import type { MapViewState } from "@deck.gl/core";

export enum GeoFeatureCategory {
	MOUNTAIN = "mountain",
	PLATEAU = "plateau",
	DESERT = "desert",
	ISLAND_GROUP = "island-group",
	ISLAND = "island",
	PENINSULA = "peninsula",
	RIVER = "river",
}

export const GEO_FEATURE_CATEGORY_NAMES: Record<GeoFeatureCategory, string> = {
	[GeoFeatureCategory.MOUNTAIN]: "山脈",
	[GeoFeatureCategory.PLATEAU]: "高原",
	[GeoFeatureCategory.DESERT]: "砂漠",
	[GeoFeatureCategory.ISLAND_GROUP]: "諸島",
	[GeoFeatureCategory.ISLAND]: "島",
	[GeoFeatureCategory.PENINSULA]: "半島",
	[GeoFeatureCategory.RIVER]: "川",
};

export enum CursorState {
	GRAB = "grab",
	GRABBING = "grabbing",
	POINTER = "pointer",
}

export const INITIAL_VIEW_STATE: MapViewState = {
	longitude: 18.382992,
	latitude: 45.404543,
	zoom: 2,
	minZoom: 0,
	maxZoom: 10,
};
