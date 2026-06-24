import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, getOrdersByClientId, getOrdersByAgentId, createOrder } from "@/lib/db";
import { addEmailLog } from "@/lib/db";
import { getPricingConfig } from "@/lib/db";

function calcPrice(serviceType: string, tier: string, configs: Awaited<ReturnType<typeof getPricingConfig>>) {
  const cfg = configs.find(c => c.serviceType === serviceType);
  const base = cfg?.basePrice ?? 100;
  const mul = { standard: 1, rush_24hr: 1.25, rush_6hr: 1.75 }[tier as string] ?? 1;
  return Math.round(base * mul);
}

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orders;
  if (userRole === "admin") orders = await getAllOrders();
  else if (userRole === "client") orders = await getOrdersByClientId(userId);
  else orders = await getOrdersByAgentId(userId);

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client")
    return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const body = await request.json();
  const configs = await getPricingConfig();

  if (body.orders && Array.isArray(body.orders)) {
    // Bulk
    const batchId = `batch-${Date.now()}`;
    const created = [];
    for (const row of body.orders) {
      if (!row.address?.trim()) continue;
      const price = calcPrice(row.serviceType ?? "inspection", row.turnaroundTier ?? "standard", configs);
      const order = await createOrder({
        address: row.address, clientId: userId,
        totalPrice: price, compensationAmount: Math.round(price * 0.65),
        serviceType: row.serviceType ?? "inspection",
        turnaroundTier: row.turnaroundTier ?? "standard",
        notes: "", customizeNotes: "", bulkBatchId: batchId,
      });
      created.push(order);
    }
    return NextResponse.json({ orders: created }, { status: 201 });
  }

  const { address, serviceType, turnaroundTier, notes, customizeNotes } = body;
  if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

  const price = calcPrice(serviceType ?? "inspection", turnaroundTier ?? "standard", configs);
  const order = await createOrder({
    address, clientId: userId,
    totalPrice: price, compensationAmount: Math.round(price * 0.65),
    serviceType: serviceType ?? "inspection",
    turnaroundTier: turnaroundTier ?? "standard",
    notes: notes ?? "", customizeNotes: customizeNotes ?? "",
    bulkBatchId: null,
  });

  await addEmailLog({ type: "new_order", to: "admin@fieldflow.com", subject: `New Order — ${address}`, body: `Client submitted a ${serviceType} order.` });

  return NextResponse.json({ order }, { status: 201 });
}
