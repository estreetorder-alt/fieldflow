import { NextRequest, NextResponse } from "next/server";
import { findAgentsByZip } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { zip } = await request.json();
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ covered: false, agentCount: 0, error: "Valid 5-digit ZIP required" }, { status: 400 });
  }
  const agents = await findAgentsByZip(zip);
  return NextResponse.json({
    covered: agents.length > 0,
    agentCount: agents.length,
    topGrade: agents.length > 0 ? Math.max(...agents.map(a => a.grade ?? 3)) : null,
  });
}
