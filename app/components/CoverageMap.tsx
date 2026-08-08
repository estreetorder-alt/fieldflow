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

export interface CoverageFlyTarget { lng: number; lat: number; zoom?: number; label?: string }

// Builds a teardrop-shaped map pin (instead of a plain dot) so markers read
// clearly against the 3D terrain, with a soft drop shadow to match the
// map's depth.
function createPinElement(color: string, size = 30): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.filter = "drop-shadow(0 3px 4px rgba(0,0,0,0.45))";
  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block">
      <path fill="${color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.2"
        d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z" />
      <circle cx="12" cy="9" r="3.4" fill="rgba(255,255,255,0.95)" />
    </svg>`;
  return el;
}

export default function CoverageMap({ flyTo }: { flyTo?: CoverageFlyTarget | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
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
      style: "mapbox://styles/mapbox/satellite-streets-v12",
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
        const el = createPinElement("#EA580C", 28);
        new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([hub.lng, hub.lat])
          .setPopup(new mapboxgl.Popup({ offset: 24, closeButton: false }).setText(hub.name))
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly-in animation: whenever a searched ZIP resolves to coordinates, glide
  // the camera down to it and drop a pulsing marker there instead of just
  // snapping the map or leaving it static.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;

    const goToTarget = () => {
      map.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom ?? 10.5,
        pitch: 55,
        bearing: -8,
        speed: 0.85,
        curve: 1.4,
        essential: true,
      });

      searchMarkerRef.current?.remove();
      const el = createPinElement("#16A34A", 34);
      el.classList.add("coverage-search-pin");
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([flyTo.lng, flyTo.lat]);
      if (flyTo.label) marker.setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false }).setText(flyTo.label));
      marker.addTo(map);
      searchMarkerRef.current = marker;
    };

    if (map.loaded()) goToTarget();
    else map.once("load", goToTarget);
  }, [flyTo]);

  if (tokenMissing) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#8A7A6C] text-sm px-6 text-center">
        Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN in environment variables to enable the live coverage map.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
