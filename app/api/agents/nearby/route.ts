import { NextRequest, NextResponse } from "next/server";
import { getAgents, updateUser } from "@/lib/db";
import { geocodeAddress, rankAgentsByProximity } from "@/lib/mapbox";

// Req. 5 — Mapbox proximity matching (self-registered agents only) when
// assigning new orders. Admin/sub_admin_orders picks an order address; this
// returns available self-registered agents ranked by real driving distance
// and time. Ghost agents never appear here — they have no GPS presence and
// are assigned manually by admin (req. 4/2).
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["admin", "sub_admin_orders"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const address = request.nextUrl.searchParams.get("address");
  if (!address?.trim()) return NextResponse.json({ error: "address query param required" }, { status: 400 });

  const orderPoint = await geocodeAddress(address);
  if (!orderPoint) {
    return NextResponse.json({ error: "Could not geocode address (check MAPBOX_TOKEN is configured)" }, { status: 422 });
  }

  const allAgents = await getAgents();
  const selfRegistered = allAgents.filter((a) => a.agentType !== "ghost" && a.available !== false);

  const ranked = await rankAgentsByProximity(
    orderPoint,
    selfRegistered.map((a) => ({ id: a.id, lastLat: a.lastLat, lastLng: a.lastLng })),
  );

  const byId = new Map(selfRegistered.map((a) => [a.id, a]));
  const results = ranked.map((r) => {
    const agent = byId.get(r.id)!;
    return {
      id: agent.id,
      name: agent.name,
      coverageZone: agent.coverageZone,
      rating: agent.rating,
      available: agent.available,
      distanceMiles: r.distanceMiles,
      durationMinutes: r.durationMinutes,
      hasKnownLocation: agent.lastLat != null && agent.lastLng != null,
    };
  });

  return NextResponse.json({ agents: results, orderPoint });
}

// Agent app calls this (or admin, on the agent's behalf) to refresh a
// self-registered agent's last known location — e.g. from browser geolocation
// or their saved coverage zip. Ghost agents are never geocoded here.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId, lat, lng, address } = await request.json();
  const targetId = agentId && ["admin", "sub_admin_orders"].includes(userRole ?? "") ? agentId : userId;
  if (userRole === "agent" && targetId !== userId)
    return NextResponse.json({ error: "Agents may only update their own location" }, { status: 403 });

  let point: { lat: number; lng: number } | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    point = { lat, lng };
  } else if (address) {
    point = await geocodeAddress(address);
  }
  if (!point) return NextResponse.json({ error: "Provide lat/lng or a geocodable address" }, { status: 400 });

  await updateUser(targetId, { lastLat: point.lat, lastLng: point.lng, lastGeocodedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true, ...point });
}
