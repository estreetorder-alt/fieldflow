import { NextRequest, NextResponse } from "next/server";
import { createPayout, getPayoutLog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agentId = userRole === "admin" ? undefined : userId;
  const log = await getPayoutLog(agentId);
  return NextResponse.json({ payouts: log });
}

export async function POST(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { agentId, amount, paypalEmail } = await request.json();
  if (!agentId || !amount || !paypalEmail) return NextResponse.json({ error: "agentId, amount, paypalEmail required" }, { status: 400 });
  await createPayout(agentId, amount, paypalEmail);
  return NextResponse.json({ ok: true }, { status: 201 });
}
