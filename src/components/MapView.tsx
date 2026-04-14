'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { RoutePoint } from '@/types';

// Dynamically import react-leaflet components (they access `window` at import time)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer   = dynamic(() => import('react-leaflet').then(m => m.TileLayer),   { ssr: false });
const Polyline    = dynamic(() => import('react-leaflet').then(m => m.Polyline),    { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });

interface MapViewProps {
  route: RoutePoint[];
  height?: string;
  /** When true the map auto-centres on the latest point (for live tracking) */
  live?: boolean;
}

/** Small inner component that re-centres the map when `center` changes. */
function RecenterControl({ center }: { center: [number, number] }) {
  // We need useMap which can only be imported client-side
  const [MapHook, setMapHook] = useState<{ useMap: () => import('leaflet').Map } | null>(null);

  useEffect(() => {
    import('react-leaflet').then((mod) => setMapHook({ useMap: mod.useMap }));
  }, []);

  // This is a child component; it needs to call useMap inside the MapContainer tree.
  // But since we can't conditionally call hooks, we return null until it loads.
  if (!MapHook) return null;
  return <RecenterInner center={center} useMap={MapHook.useMap} />;
}

function RecenterInner({ center, useMap }: { center: [number, number]; useMap: () => import('leaflet').Map }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapView({ route, height = '300px', live = false }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Import leaflet CSS side-effect
    import('leaflet/dist/leaflet.css');
  }, []);

  const positions: [number, number][] = useMemo(
    () => route.map(p => [p.latitude, p.longitude]),
    [route]
  );

  const center: [number, number] = useMemo(() => {
    if (positions.length === 0) return [60.17, 24.94]; // default Helsinki
    return live ? positions[positions.length - 1] : positions[Math.floor(positions.length / 2)];
  }, [positions, live]);

  if (!mounted) {
    return <div className="skeleton rounded-2xl w-full" style={{ height }} />;
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border-color shadow-card-shadow relative z-0" style={{ height }}>
      {route.length > 0 ? (
        <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={positions}
            pathOptions={{ color: '#ff6200', weight: 4, opacity: 0.9 }}
          />
          {/* Live position dot */}
          {positions.length > 0 && (
            <CircleMarker
              center={positions[positions.length - 1]}
              radius={7}
              pathOptions={{
                fillColor: '#3b82f6',
                fillOpacity: 1,
                color: '#ffffff',
                weight: 3,
              }}
            />
          )}
          {live && <RecenterControl center={center} />}
        </MapContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-bg-secondary text-text-tertiary">
          <span className="text-sm">No route data</span>
        </div>
      )}
    </div>
  );
}
