"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Representative hub cities across Snapect's coverage network.
// Coordinates are real; used to plot agent-hub markers on the map.
const HUBS: { name: string; lng: number; lat: number }[] = [
  { name: "Seattle, WA", lng: -122.3321, lat: 47.6062 },
  { name: "Los Angeles, CA", lng: -118.2437, lat: 34.0522 },
  { name: "Denver, CO", lng: -104.9903, lat: 39.7392 },
  { name: "Chicago, IL", lng: -87.6298, lat: 41.8781 },
  { name: "New York, NY", lng: -74.006, lat: 40.7128 },
  { name: "Boston, MA", lng: -71.0589, lat: 42.3601 },
  { name: "Houston, TX", lng: -95.3698, lat: 29.7604 },
  { name: "Atlanta, GA", lng: -84.388, lat: 33.749 },
  { name: "Phoenix, AZ", lng: -112.074, lat: 33.4484 },
  { name: "Miami, FL", lng: -80.1918, lat: 25.7617 },
];

export default function CoverageMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setTokenMissing(true);
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-95, 39],
      zoom: 3.3,
      pitch: 45,
      bearing: -10,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.scrollZoom.disable();

    map.on("load", () => {
      // 3D terrain + sky for depth
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun-intensity": 8,
        },
      });

      HUBS.forEach((hub) => {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.background = "#EA580C";
        el.style.boxShadow = "0 0 12px 3px rgba(234,88,12,0.8)";
        el.style.border = "2px solid rgba(255,255,255,0.8)";

        new mapboxgl.Marker({ element: el })
          .setLngLat([hub.lng, hub.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(hub.name))
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  if (tokenMissing) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#8A7A6C] text-sm px-6 text-center">
        Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN in environment variables to enable the live coverage map.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
