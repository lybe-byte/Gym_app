'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RoutePoint } from '@/types';
import 'leaflet/dist/leaflet.css';

// Leaflet accesses window during instantiation, so import it dynamically and disable SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });

interface MapViewProps {
  route: RoutePoint[];
  height?: string;
}

export default function MapView({ route, height = '300px' }: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  
  // Fix for leaflet missing target icon issues if needed (standard Next.js + Leaflet workaround)
  useEffect(() => {
    setMounted(true);
    // Workaround for Leaflet's default marker icon not found issue in nextjs (if markers were to be used)
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
      iconUrl: require('leaflet/dist/images/marker-icon.png'),
      shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });
  }, []);

  if (!mounted) return <div className="skeleton rounded-2xl w-full" style={{ height }} />;

  const positions: [number, number][] = route.map(p => [p.latitude, p.longitude]);
  const center: [number, number] = positions.length > 0 ? positions[Math.floor(positions.length/2)] : [0, 0];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border-color shadow-card-shadow relative z-0" style={{ height }}>
      {route.length > 0 ? (
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles-filter"
          />
          <Polyline positions={positions} pathOptions={{ color: '#ff6200', weight: 4 }} />
        </MapContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-bg-secondary text-text-tertiary border border-dashed rounded-2xl border-border-color">
          No Route Tracked
        </div>
      )}
    </div>
  );
}
