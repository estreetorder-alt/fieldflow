import { NextRequest, NextResponse } from "next/server";
import { getAgentZipCodes, setAgentZipCodes } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agentId = request.nextUrl.searchParams.get("agentId") ?? userId;
  const zips = await getAgentZipCodes(agentId);
  return NextResponse.json({ zips });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { zips } = await request.json();
  if (!Array.isArray(zips)) return NextResponse.json({ error: "zips array required" }, { status: 400 });
  await setAgentZipCodes(userId, zips);
  return NextResponse.json({ ok: true });
}
