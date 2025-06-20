import type { MapViewState } from "@deck.gl/core";

export enum GeoFeatureCategory {
	MOUNTAIN = "mountain",
	PLATEAU = "plateau",
	DESERT = "desert",
	ISLAND = "island",
	PENINSULA = "peninsula",
}

export const GEO_FEATURE_CATEGORY_NAMES: Record<GeoFeatureCategory, string> = {
	[GeoFeatureCategory.MOUNTAIN]: "山脈",
	[GeoFeatureCategory.PLATEAU]: "高原",
	[GeoFeatureCategory.DESERT]: "砂漠",
	[GeoFeatureCategory.ISLAND]: "島",
	[GeoFeatureCategory.PENINSULA]: "半島",
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
