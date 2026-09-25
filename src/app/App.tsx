import { useCallback, useEffect, useMemo, useState } from "react";
import type { City } from "../data/city";
import { boundsOf, FALLBACK_BOUNDS } from "../map/bounds";
import { type FocusRequest, MapView } from "../map/MapView";
import { SearchBox } from "../search/SearchBox";
import { BoundaryNote } from "./BoundaryNote";
import { COPY } from "./copy";
import { ErrorBanner } from "./ErrorBanner";
import { type AppData, loadAppData } from "./loadAppData";
import { SelectionPanel } from "./SelectionPanel";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  useEffect(() => {
    loadAppData(fetch, location.origin).then(setData);
  }, []);

  const cities = data?.cities ?? [];
  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedId) ?? null,
    [cities, selectedId],
  );
  const onBasemapError = useCallback(() => setBasemapFailed(true), []);
  const onSearchSelect = useCallback((city: City) => {
    setSelectedId(city.id);
    setFocus((previous) => ({ lon: city.lon, lat: city.lat, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ocean font-body text-body text-on-surface">
      {data?.basemapUrl != null && (
        <MapView
          // maplibre-gl.css の `.maplibregl-map { position: relative }` が読み込み順で
          // 後勝ちし absolute を打ち消すため、! で position だけ important にする
          className="!absolute inset-0"
          basemapUrl={data.basemapUrl}
          cities={cities}
          initialBounds={data.cities ? boundsOf(data.cities) : FALLBACK_BOUNDS}
          selectedId={selectedId}
          focus={focus}
          onSelect={setSelectedId}
          onBasemapError={onBasemapError}
        />
      )}
      {/* max-w-sm は余白トークンの sm と衝突しうるので、DESIGN.md の Layout にある 24rem を直接指定する */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-sm p-md md:max-w-[24rem]">
        <div className="pointer-events-auto">
          <SearchBox cities={cities} onSelect={onSearchSelect} />
        </div>
        {(data?.basemapError || basemapFailed) && <ErrorBanner message={COPY.basemapLoadError} />}
        {data?.citiesError && <ErrorBanner message={COPY.citiesLoadError} />}
      </div>
      {/* スマートフォンでは選択パネル（下部）とぶつかるので、選択中は隠す */}
      <BoundaryNote className={selectedCity ? "max-md:hidden" : ""} />
      {selectedCity && <SelectionPanel city={selectedCity} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
