import { NextRequest, NextResponse } from "next/server";
import { createPayout, getPayoutLog, getUserById, logAdminAction } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agentId = userRole === "admin" ? undefined : userId;
  const log = await getPayoutLog(agentId);
  return NextResponse.json({ payouts: log });
}

export async function POST(request: NextRequest) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { agentId, amount, paypalEmail } = await request.json();
  if (!agentId || !amount || !paypalEmail) return NextResponse.json({ error: "agentId, amount, paypalEmail required" }, { status: 400 });
  await createPayout(agentId, amount, paypalEmail);
  const [admin, agent] = await Promise.all([getUserById(adminId), getUserById(agentId)]);
  await logAdminAction({ actorId: adminId, actorName: admin?.name ?? "Admin", action: "payout.create", targetType: "user", targetId: agentId, details: { agentName: agent?.name, amount, paypalEmail } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
