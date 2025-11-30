import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'react';

/**
 * PMTilesプロトコルをMapLibre GL JSに登録するフック
 *
 * MapLibreがpmtiles://スキームのURLを読み込めるようにするプロトコルを登録。
 * コンポーネントのライフサイクルに合わせて登録・解除を管理する。
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   usePMTilesProtocol();
 *   return <Map ... />;
 * }
 * ```
 */
export function usePMTilesProtocol(): void {
  const protocolRef = useRef<Protocol | null>(null);

  useEffect(() => {
    const protocol = new Protocol();
    protocolRef.current = protocol;

    maplibregl.addProtocol('pmtiles', protocol.tile);

    return () => {
      maplibregl.removeProtocol('pmtiles');
      protocolRef.current = null;
    };
  }, []);
}
