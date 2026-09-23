import { useEffect, useState } from "react";
import { boundsOf, FALLBACK_BOUNDS } from "../map/bounds";
import { MapView } from "../map/MapView";
import { type AppData, loadAppData } from "./loadAppData";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadAppData(fetch, location.origin).then(setData);
  }, []);

  if (data?.tilesUrl == null) {
    return <div className="h-dvh w-full bg-ocean" />;
  }
  return (
    <MapView
      className="h-dvh w-full"
      tilesUrl={data.tilesUrl}
      cities={data.cities ?? []}
      initialBounds={data.cities ? boundsOf(data.cities) : FALLBACK_BOUNDS}
      selectedId={selectedId}
      focus={null}
      onSelect={setSelectedId}
      onTilesError={() => console.error("タイルの読み込みに失敗")}
    />
  );
}
