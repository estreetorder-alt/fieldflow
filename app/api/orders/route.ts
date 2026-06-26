import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, getOrdersByClientId, getOrdersByAgentId, createOrder, autoDispatch, addEmailLog, getUserById } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { SERVICE_MAP, calcServicePrice, calcCompensation, getDeadlineDate } from "@/lib/services";
import { sendDispatchEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orders;
  if (userRole === "admin") {
    orders = await getAllOrders();
  } else if (userRole === "client") {
    const { data: subs } = await supabase.from("users").select("id").eq("parent_client_id", userId);
    const subIds = (subs ?? []).map(s => (s as Record<string,unknown>).id as string);
    const results = await Promise.all([userId, ...subIds].map(id => getOrdersByClientId(id)));
    orders = results.flat().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    orders = await getOrdersByAgentId(userId);
  }

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client","admin"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const body = await request.json();

  // If Stripe is configured and this is not a webhook-confirmed order,
  // return a checkout URL instead of creating the order directly
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const skipPayment = body.skipPayment === true || !stripeKey || userRole === "admin";

  const createSingle = async (row: {
    address: string; serviceId?: string; turnaroundTier?: string;
    notes?: string; customizeNotes?: string; customShotList?: string;
    customClientPrice?: number; dateStamp?: boolean;
    lat?: number; lng?: number; clientId?: string; bulkBatchId?: string | null;
    paymentStatus?: string; stripePaymentIntentId?: string;
  }) => {
    const serviceId = row.serviceId ?? "ext_7";
    const tier = row.turnaroundTier ?? "standard";
    const svc = SERVICE_MAP[serviceId];
    const isCustom = svc?.isCustom ?? false;

    const totalPrice = isCustom
      ? (row.customClientPrice ?? 0)
      : calcServicePrice(serviceId, tier);
    const compensation = isCustom
      ? Math.round((row.customClientPrice ?? 0) * 0.65)
      : calcCompensation(serviceId, tier);

    const order = await createOrder({
      address: row.address,
      clientId: row.clientId ?? userId,
      totalPrice,
      compensationAmount: compensation,
      serviceType: svc?.name ?? serviceId,
      turnaroundTier: tier,
      notes: row.notes ?? "",
      customizeNotes: row.customizeNotes ?? "",
      bulkBatchId: row.bulkBatchId ?? null,
    });

    // Extra fields
    const extra: Record<string,unknown> = { service_id: serviceId };
    if (row.dateStamp) extra.date_stamp = true;
    if (row.lat) extra.address_lat = row.lat;
    if (row.lng) extra.address_lng = row.lng;
    if (isCustom && row.customShotList) extra.custom_shot_list = row.customShotList;
    if (isCustom && row.customClientPrice) extra.custom_client_price = row.customClientPrice;
    if (row.paymentStatus) extra.payment_status = row.paymentStatus;
    if (row.stripePaymentIntentId) extra.stripe_payment_intent_id = row.stripePaymentIntentId;
    await supabase.from("orders").update(extra).eq("id", order.id);

    // Auto-dispatch if payment confirmed (or skip payment mode)
    if (skipPayment || row.paymentStatus === "paid") {
      const zipMatch = row.address.match(/\b(\d{5})\b/);
      if (zipMatch) {
        const agentId = await autoDispatch(order.id, zipMatch[1]);
        if (agentId) {
          const agent = await getUserById(agentId);
          const deadline = getDeadlineDate(tier, new Date());
          if (agent?.email) {
            await sendDispatchEmail({
              agentEmail: agent.email,
              agentName: agent.name,
              address: row.address,
              serviceType: svc?.name ?? serviceId,
              compensationAmount: compensation,
              deadline: deadline.toLocaleString(),
              orderId: order.id,
              baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://fieldflow-livid.vercel.app",
            });
          }
        }
      }
    }

    await addEmailLog({
      type: "new_order", to: "admin@fieldflow.com",
      subject: `New Order — ${row.address}`,
      body: `Service: ${svc?.name ?? serviceId}. Price: $${totalPrice}. Tier: ${tier}.`,
    });

    return order;
  };

  // Bulk orders
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

  // Custom order: if price is 0 or not set, needs admin review — skip payment
  const isCustom = SERVICE_MAP[body.serviceId ?? ""]?.isCustom;
  if (isCustom && !body.customClientPrice) {
    return NextResponse.json({ error: "Custom orders require a price" }, { status: 400 });
  }

  const order = await createSingle(body);
  return NextResponse.json({ order }, { status: 201 });
}
