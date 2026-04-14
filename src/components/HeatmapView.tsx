'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { RoutePoint } from '@/types';

// Dynamically import react-leaflet components since they reference `window`
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), { ssr: false });

export interface HeatmapViewProps {
  routePoints: RoutePoint[];
  height?: string;
}

export default function HeatmapView({ routePoints, height = '300px' }: HeatmapViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Center on latest point, or default to Helsinki
  const defaultCenter: [number, number] = useMemo(() => {
    if (routePoints.length > 0) {
      const last = routePoints[routePoints.length - 1];
      return [last.latitude, last.longitude];
    }
    return [60.1699, 24.9384]; // Helsinki
  }, [routePoints]);

  if (!isMounted) {
    return (
      <div 
        style={{ height }} 
        className="w-full bg-bg-tertiary flex items-center justify-center text-text-tertiary text-sm rounded-2xl animate-pulse"
      >
        Loading Heatmap...
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />
        {routePoints.length > 0 && <HeatmapLayer points={routePoints} />}
      </MapContainer>
    </div>
  );
}
