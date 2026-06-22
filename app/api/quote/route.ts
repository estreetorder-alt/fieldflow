import { NextRequest, NextResponse } from "next/server";
import { calculatePrice, calculateCompensation } from "@/lib/pricing";
import type { TurnaroundTier } from "@/lib/store";

export async function POST(request: NextRequest) {
  const { serviceType, turnaroundTier = "standard" } = await request.json();
  if (!serviceType) return NextResponse.json({ error: "Missing serviceType" }, { status: 400 });
  const tier = turnaroundTier as TurnaroundTier;
  const price = calculatePrice(serviceType, tier);
  const compensation = calculateCompensation(price, tier);
  return NextResponse.json({ price, compensation });
}
