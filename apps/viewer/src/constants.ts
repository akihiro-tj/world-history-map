import type { MapViewState } from "@deck.gl/core";

export enum GeoFeatureCategory {
	ISLAND_GROUP = "island-group",
	ISLAND = "island",
	PENINSULA = "peninsula",
	DESERT = "desert",
	PLATEAU = "plateau",
	MOUNTAIN = "mountain",
	LAKE = "lake",
	RIVER = "river",
}

export const GEO_FEATURE_CATEGORY_NAMES: Record<GeoFeatureCategory, string> = {
	[GeoFeatureCategory.ISLAND_GROUP]: "諸島",
	[GeoFeatureCategory.ISLAND]: "島",
	[GeoFeatureCategory.PENINSULA]: "半島",
	[GeoFeatureCategory.DESERT]: "砂漠",
	[GeoFeatureCategory.PLATEAU]: "高原",
	[GeoFeatureCategory.MOUNTAIN]: "山",
	[GeoFeatureCategory.LAKE]: "湖",
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
