import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, getOrdersByClientId, getOrdersByAgentId, createOrder, autoDispatch, addEmailLog, getPricingConfig, getPhotoPackages } from "@/lib/db";
import { supabase } from "@/lib/supabase";

function calcPrice(serviceType: string, tier: string, configs: Awaited<ReturnType<typeof getPricingConfig>>, pkg?: Awaited<ReturnType<typeof getPhotoPackages>>[0]) {
  if (pkg) {
    const mul = { standard: 1, rush_24hr: 1.25, rush_6hr: 1.75 }[tier] ?? 1;
    return Math.round(pkg.basePrice * mul);
  }
  const cfg = configs.find(c => c.serviceType === serviceType);
  const base = cfg?.basePrice ?? 100;
  const mul = { standard: 1, rush_24hr: 1.25, rush_6hr: 1.75 }[tier] ?? 1;
  return Math.round(base * mul);
}

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orders;
  if (userRole === "admin") orders = await getAllOrders();
  else if (userRole === "client") {
    // Include sub-account orders
    const { data: subs } = await supabase.from("users").select("id").eq("parent_client_id", userId);
    const subIds = (subs ?? []).map(s => (s as Record<string,unknown>).id as string);
    const allClientIds = [userId, ...subIds];
    const results = await Promise.all(allClientIds.map(id => getOrdersByClientId(id)));
    orders = results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    orders = await getOrdersByAgentId(userId);
  }

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client", "admin"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const body = await request.json();
  const [configs, packages] = await Promise.all([getPricingConfig(), getPhotoPackages()]);

  const createSingle = async (row: {
    address: string; serviceType?: string; turnaroundTier?: string;
    notes?: string; customizeNotes?: string; packageId?: string;
    dateStamp?: boolean; lat?: number; lng?: number;
    clientId?: string; bulkBatchId?: string | null;
  }) => {
    const pkg = row.packageId ? packages.find(p => p.id === row.packageId) : undefined;
    const tier = row.turnaroundTier ?? "standard";
    const svcType = pkg ? "inspection" : (row.serviceType ?? "inspection");
    const price = calcPrice(svcType, tier, configs, pkg);
    const comp = Math.round(price * 0.65);

    const order = await createOrder({
      address: row.address,
      clientId: row.clientId ?? userId,
      totalPrice: price,
      compensationAmount: comp,
      serviceType: svcType,
      turnaroundTier: tier,
      notes: row.notes ?? "",
      customizeNotes: row.customizeNotes ?? "",
      bulkBatchId: row.bulkBatchId ?? null,
    });

    // Extra fields via direct update
    const extra: Record<string,unknown> = {};
    if (row.dateStamp) extra.date_stamp = true;
    if (pkg) extra.photo_package = pkg.id;
    if (row.lat) extra.address_lat = row.lat;
    if (row.lng) extra.address_lng = row.lng;
    if (Object.keys(extra).length) {
      await supabase.from("orders").update(extra).eq("id", order.id);
    }

    // Auto-dispatch: extract ZIP from address
    const zipMatch = row.address.match(/\b(\d{5})\b/);
    if (zipMatch) {
      const agentId = await autoDispatch(order.id, zipMatch[1]);
      if (agentId) {
        await addEmailLog({ type: "order_dispatched", to: agentId, subject: `New order dispatched to you — ${row.address}`, body: `You have 3 hours to accept or decline.` });
      }
    }

    await addEmailLog({ type: "new_order", to: "admin@fieldflow.com", subject: `New Order — ${row.address}`, body: `${svcType} order submitted.` });
    return order;
  };

  // Bulk
  if (body.orders && Array.isArray(body.orders)) {
    const batchId = `batch-${Date.now()}`;
    const created = [];
    for (const row of body.orders) {
      if (!row.address?.trim()) continue;
      created.push(await createSingle({ ...row, bulkBatchId: batchId }));
    }
    return NextResponse.json({ orders: created }, { status: 201 });
  }

  if (!body.address) return NextResponse.json({ error: "Address required" }, { status: 400 });
  const order = await createSingle(body);
  return NextResponse.json({ order }, { status: 201 });
}
