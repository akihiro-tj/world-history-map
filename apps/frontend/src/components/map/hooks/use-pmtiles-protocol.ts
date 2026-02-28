import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'react';

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
