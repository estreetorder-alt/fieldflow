import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ pricing: store.pricingConfig });
}

export async function PATCH(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;

  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, basePrice, urgencyMultiplier, active } = await request.json();

  const idx = store.pricingConfig.findIndex((p) => p.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (basePrice !== undefined) store.pricingConfig[idx].basePrice = Number(basePrice);
  if (urgencyMultiplier !== undefined) store.pricingConfig[idx].urgencyMultiplier = Number(urgencyMultiplier);
  if (active !== undefined) store.pricingConfig[idx].active = Boolean(active);

  return NextResponse.json({ pricing: store.pricingConfig[idx] });
}
