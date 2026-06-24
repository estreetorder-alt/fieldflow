import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { address } = await request.json();
  if (!address?.trim()) return NextResponse.json({ valid: false, error: "Address required" }, { status: 400 });

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    // Fallback: basic format check
    const hasNumber = /\d/.test(address);
    const hasState = /,\s*[A-Z]{2}/.test(address);
    return NextResponse.json({ valid: hasNumber && hasState, suggestion: null });
  }

  const query = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&types=address&limit=1&country=US`;
  const res = await fetch(url);
  const data = await res.json() as { features?: Array<{ place_name: string; center: [number, number] }> };
  const feature = data.features?.[0];

  if (!feature) return NextResponse.json({ valid: false, suggestion: null });
  return NextResponse.json({
    valid: true,
    suggestion: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
  });
}
