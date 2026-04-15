import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RoutePoint } from '@/types';

// Client-side only import for leaflet.heat
if (typeof window !== 'undefined') {
  require('leaflet.heat');
}


export default function HeatmapLayer({ points }: { points: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert RoutePoints to [lat, lng, intensity]
    // We give every point intensity = 1
    const heatPoints = points.map(p => [p.latitude, p.longitude, 1] as [number, number, number]);

    // @ts-ignore - leaflet.heat adds this to L, but types occasionally miss it
    const layer = L.heatLayer(heatPoints, {
      radius: 12,
      blur: 15,
      maxZoom: 16,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}
