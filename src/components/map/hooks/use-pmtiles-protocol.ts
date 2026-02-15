import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'react';

/**
 * Hook to register PMTiles protocol with MapLibre GL JS
 *
 * Registers protocol to enable MapLibre to load pmtiles:// scheme URLs.
 * Manages registration and cleanup with component lifecycle.
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
