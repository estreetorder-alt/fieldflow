// Req. 5 — Mapbox proximity matching: real driving distance and time,
// restricted to self-registered agents only (ghost agents have no GPS
// presence to match against, and are dispatched manually by admin).

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Geocode a free-text US address/zip into lat/lng via Mapbox. Returns null if no token or no match. */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token || !address?.trim()) return null;
  try {
    const query = encodeURIComponent(address.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1&country=US`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Array<{ center: [number, number] }> };
    const feature = data.features?.[0];
    if (!feature) return null;
    return { lat: feature.center[1], lng: feature.center[0] };
  } catch {
    return null;
  }
}

export interface DrivingRoute {
  distanceMiles: number;
  durationMinutes: number;
}

/** Real driving distance (miles) and time (minutes) between two points via Mapbox Directions API. */
export async function drivingDistance(from: GeoPoint, to: GeoPoint): Promise<DrivingRoute | null> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${token}&overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: Array<{ distance: number; duration: number }> };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceMiles: Math.round((route.distance / 1609.34) * 10) / 10, // meters -> miles
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/**
 * Given an order location and a list of self-registered agents (each with
 * last known lat/lng), returns them sorted nearest-first by real driving
 * distance/time. Agents without a cached location, or ghost agents, should
 * be filtered out by the caller before invoking this — ghost agents never
 * appear in proximity matching (req. 5 applies to self-registered only).
 */
export async function rankAgentsByProximity<T extends { id: string; lastLat?: number; lastLng?: number }>(
  orderPoint: GeoPoint,
  agents: T[],
): Promise<Array<T & { distanceMiles: number | null; durationMinutes: number | null }>> {
  const results = await Promise.all(
    agents.map(async (agent) => {
      if (agent.lastLat == null || agent.lastLng == null) {
        return { ...agent, distanceMiles: null, durationMinutes: null };
      }
      const route = await drivingDistance(orderPoint, { lat: agent.lastLat, lng: agent.lastLng });
      return {
        ...agent,
        distanceMiles: route?.distanceMiles ?? null,
        durationMinutes: route?.durationMinutes ?? null,
      };
    }),
  );
  // Nearest first; agents with unknown location sort last.
  return results.sort((a, b) => {
    if (a.distanceMiles == null && b.distanceMiles == null) return 0;
    if (a.distanceMiles == null) return 1;
    if (b.distanceMiles == null) return -1;
    return a.distanceMiles - b.distanceMiles;
  });
}
