import { NextRequest, NextResponse } from "next/server";
import { calcServicePrice, calcCompensation, SERVICE_MAP, TIER_LABELS } from "@/lib/services";

export async function POST(request: NextRequest) {
  const { serviceId, turnaroundTier = "standard", customPrice } = await request.json();
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  const svc = SERVICE_MAP[serviceId];
  if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const price = svc.isCustom ? (customPrice ?? 0) : calcServicePrice(serviceId, turnaroundTier);
  const compensation = calcCompensation(serviceId, turnaroundTier, customPrice);

  return NextResponse.json({
    serviceId, serviceName: svc.name,
    turnaroundTier, turnaroundLabel: TIER_LABELS[turnaroundTier],
    totalPrice: price, compensationAmount: compensation,
    shotList: svc.shotList ?? [],
    isCustom: svc.isCustom ?? false,
  });
}
