'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { RoutePoint } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Dynamically import react-leaflet components since they reference `window`
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), { ssr: false });

export interface HeatmapViewProps {
  height?: string;
  routePoints?: RoutePoint[]; // kept for backward compatibility if still passed
}

export default function HeatmapView({ height = '300px' }: HeatmapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [heatmapData, setHeatmapData] = useState<RoutePoint[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) return;

      try {
        const runsRef = query(collection(db(), `users/${currentUser.uid}/runs`), orderBy('createdAt', 'desc'), limit(30));
        const snapshot = await getDocs(runsRef);
        
        let allPts: RoutePoint[] = [];
        const promises = snapshot.docs.map(async (runDoc) => {
          const ptsSnap = await getDocs(collection(db(), `users/${currentUser.uid}/runs/${runDoc.id}/routePoints`));
          return ptsSnap.docs.map((d) => d.data() as RoutePoint);
        });
        
        const results = await Promise.all(promises);
        results.forEach(pts => allPts.push(...pts));
        setHeatmapData(allPts);
      } catch (error) {
        console.error("Heatmap 401/fetch error:", error);
      }
    });

    return () => unsub();
  }, []);

  // Ensure the component does not try to read Firestore before the user is authenticated:
  if (!user) return null;

  // Center on latest point, or default to Helsinki
  const defaultCenter: [number, number] = useMemo(() => {
    if (heatmapData.length > 0) {
      const last = heatmapData[heatmapData.length - 1];
      return [last.latitude, last.longitude];
    }
    return [60.1699, 24.9384]; // Helsinki
  }, [heatmapData]);

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
        {heatmapData.length > 0 && <HeatmapLayer points={heatmapData} />}
      </MapContainer>
    </div>
  );
}
