import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatLayer({ points, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!points || points.length === 0) return;

    // points: [[lat, lng, intensity], ...]
    const layer = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 16,
    });

    layer.addTo(map);

    return () => {
      try {
        map.removeLayer(layer);
      } catch {
        // ignore
      }
    };
  }, [map, points, enabled]);

  return null;
}
