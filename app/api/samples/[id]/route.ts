import { NextRequest, NextResponse } from "next/server";
import { reviewSample } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const { decision, notes } = await request.json();
  if (!["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  await reviewSample(id, decision, userId, notes ?? "");
  return NextResponse.json({ ok: true });
}
