import { NextRequest, NextResponse } from "next/server";
import { getPricingConfig, updatePricingConfig } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pricing = await getPricingConfig();
  return NextResponse.json({ pricing });
}

export async function PATCH(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id, basePrice, urgencyMultiplier, active } = await request.json();
  await updatePricingConfig(id, { basePrice, urgencyMultiplier, active });
  return NextResponse.json({ ok: true });
}
