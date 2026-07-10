import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// Admin-only: order + bid activity stats for a single user.
// Agents  → orders accepted / pending / completed + every bid with its timestamp.
// Vendors → orders placed / pending / completed.
export async function GET(request: NextRequest, { params }: Params) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "agent") {
    const [ordersRes, bidsRes] = await Promise.all([
      supabase.from("orders").select("id, address, status, created_at").eq("assigned_agent_id", id),
      supabase.from("bids").select("id, order_id, amount, status, placed_at, placed_by_admin, orders(address)").eq("agent_id", id).order("placed_at", { ascending: false }),
    ]);
    const orders = ordersRes.data ?? [];
    const bids = (bidsRes.data ?? []) as Record<string, unknown>[];

    const completed = orders.filter(o => o.status === "completed").length;
    const cancelled = orders.filter(o => o.status === "cancelled").length;
    const pending = orders.length - completed - cancelled; // accepted but not yet completed

    return NextResponse.json({
      role: "agent",
      ordersAccepted: orders.length,
      ordersPending: pending,
      ordersCompleted: completed,
      ordersCancelled: cancelled,
      bidsPlaced: bids.length,
      bidsAccepted: bids.filter(b => b.status === "accepted").length,
      bids: bids.slice(0, 50).map(b => ({
        id: b.id,
        orderId: b.order_id,
        address: (b.orders as { address?: string } | null)?.address ?? b.order_id,
        amount: Number(b.amount),
        status: b.status,
        placedByAdmin: b.placed_by_admin === true,
        placedAt: b.placed_at,
      })),
    });
  }

  // Vendor (client) — orders they placed
  const { data } = await supabase.from("orders").select("id, address, status, created_at").eq("client_id", id).order("created_at", { ascending: false });
  const orders = data ?? [];
  const completed = orders.filter(o => o.status === "completed").length;
  const cancelled = orders.filter(o => o.status === "cancelled").length;

  return NextResponse.json({
    role: "client",
    ordersPlaced: orders.length,
    ordersPending: orders.length - completed - cancelled,
    ordersCompleted: completed,
    ordersCancelled: cancelled,
    recentOrders: orders.slice(0, 20).map(o => ({ id: o.id, address: o.address, status: o.status, createdAt: o.created_at })),
  });
}
