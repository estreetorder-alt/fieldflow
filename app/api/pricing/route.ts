import { NextRequest, NextResponse } from "next/server";
import { SERVICE_CATALOG, Service } from "@/lib/services";
import { supabase } from "@/lib/supabase";

// Load overrides from DB, merge with catalog defaults
async function getServicePricing() {
  const { data } = await supabase.from("services_catalog").select("*");
  const overrides: Record<string, Partial<Service>> = {};
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    overrides[r.id as string] = {
      basePrice: Number(r.base_price),
      compensation: Number(r.compensation),
      active: r.active as boolean,
    };
  }

  return SERVICE_CATALOG.map(cat => ({
    ...cat,
    services: cat.services.map(svc => ({
      ...svc,
      ...(overrides[svc.id] ?? {}),
    })),
  }));
}

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const catalog = await getServicePricing();
  // Also return flat pricing list for backward compat
  const pricing = catalog.flatMap(c => c.services).map(s => ({
    id: s.id, serviceType: s.id, name: s.name,
    basePrice: s.basePrice, compensation: s.compensation,
    urgencyMultiplier: 1.25, active: s.active, category: s.category,
    description: s.description, photoCount: s.photoCount, shotList: s.shotList,
    isCustom: s.isCustom, requiresInterior: s.requiresInterior,
  }));
  return NextResponse.json({ pricing, catalog });
}

export async function PATCH(request: NextRequest) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();
  const { id, basePrice, compensation, active, rushFlat24, rushFlat6 } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Upsert into services_catalog override table
  const svc = SERVICE_CATALOG.flatMap(c => c.services).find(s => s.id === id);
  if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  await supabase.from("services_catalog").upsert({
    id,
    name: svc.name,
    description: svc.description,
    base_price: basePrice ?? svc.basePrice,
    compensation: compensation ?? svc.compensation,
    category: svc.category,
    photo_count: svc.photoCount ?? null,
    shot_list: svc.shotList ?? [],
    is_custom: svc.isCustom ?? false,
    requires_interior: svc.requiresInterior ?? false,
    active: active ?? svc.active,
    ...(rushFlat24 !== undefined ? { rush_flat_24: rushFlat24 } : {}),
    ...(rushFlat6 !== undefined ? { rush_flat_6: rushFlat6 } : {}),
  }, { onConflict: "id" });

  const { getUserById, logAdminAction } = await import("@/lib/db");
  const admin = await getUserById(adminId);
  await logAdminAction({
    actorId: adminId, actorName: admin?.name ?? "Admin", action: "pricing.update",
    targetType: "service", targetId: id,
    details: { basePrice: basePrice ?? svc.basePrice, compensation: compensation ?? svc.compensation, active: active ?? svc.active },
  });

  return NextResponse.json({ ok: true });
}
