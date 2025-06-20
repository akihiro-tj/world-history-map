import { GeoFeatureCategory } from "@/constants";
import { beforeEach, describe, expect, it } from "vitest";
import { useViewerState } from "../use-viewer-state.svelte";

describe("useViewerState", () => {
	let viewerState: ReturnType<typeof useViewerState>;

	beforeEach(() => {
		viewerState = useViewerState();
	});

	describe("showFilterPanel", () => {
		it("should show the filter panel", () => {
			viewerState.showFilterPanel();
			expect(viewerState.isFilterPanelVisible).toBe(true);
		});

		it("should unselect the geo feature", () => {
			viewerState.showFilterPanel();
			expect(viewerState.selectedGeoFeature).toBeNull();
		});
	});

	describe("hideFilterPanel", () => {
		it("should hide the filter panel", () => {
			viewerState.hideFilterPanel();
			expect(viewerState.isFilterPanelVisible).toBe(false);
		});
	});

	describe("updateFilter", () => {
		it("should update the filter group", () => {
			viewerState.updateFilter(GeoFeatureCategory.MOUNTAIN, true);
			viewerState.updateFilter(GeoFeatureCategory.ISLAND, false);
			expect(viewerState.filterGroups).toContainEqual({
				id: "terrain",
				label: "地形",
				filter: {
					[GeoFeatureCategory.MOUNTAIN]: true,
					[GeoFeatureCategory.PLATEAU]: true,
					[GeoFeatureCategory.DESERT]: true,
					[GeoFeatureCategory.ISLAND]: false,
					[GeoFeatureCategory.PENINSULA]: true,
				},
			});
		});
	});

	describe("unselectGeoFeature", () => {
		it("should unselect the geo feature", () => {
			viewerState.unselectGeoFeature();
			expect(viewerState.selectedGeoFeature).toBeNull();
		});
	});
});
