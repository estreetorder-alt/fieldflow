import { supabase } from "./supabase";
import { getWalletBalance, getUserById } from "./db";
import { startChat, addMessage } from "./supportChat";
import { sendAdminNotification, sendOverdraftDecisionEmail } from "./email";

// ── Payment state model ──────────────────────────────────────────
// Replaces the old single `invoicePaid` boolean (kept in sync for
// backward-compat) with three explicit numbers/states per order:
//   amountPaid, amountDue, paymentState ('unpaid' | 'partially_paid' | 'paid')
// Orders are NEVER blocked by wallet balance — see acceptOrderCharge below.

export type PaymentState = "unpaid" | "partially_paid" | "paid";

export interface ChargeResult {
  charged: number;
  amountPaid: number;
  amountDue: number;
  paymentState: PaymentState;
}

/**
 * Called once, at bid-acceptance time. Atomically applies whatever wallet
 * balance the vendor currently has toward the order (via the
 * `accept_order_charge` Postgres function, which row-locks the vendor's
 * wallet and the order so a concurrent order can't spend the same dollars
 * twice). Always succeeds — there is no insufficient-funds rejection here.
 * If the order ends up not fully paid, the caller should follow up with
 * `openOverdraftRequest` so the shortfall is tracked and admin can see it.
 */
export async function acceptOrderCharge(orderId: string): Promise<ChargeResult> {
  const { data, error } = await supabase.rpc("accept_order_charge", { p_order_id: orderId });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    charged: Number(row.charged),
    amountPaid: Number(row.amount_paid),
    amountDue: Number(row.amount_due),
    paymentState: row.payment_state as PaymentState,
  };
}

/**
 * Called after a Cash App/Zelle top-up (or any wallet credit) is confirmed.
 * Atomically walks the vendor's unpaid/partially-paid orders oldest-first
 * and applies as much of the fresh balance as covers each one, in a single
 * locked transaction — safe against a duplicate confirmation or two top-ups
 * landing at the same moment.
 */
export async function settleVendorUnpaidOrders(vendorId: string): Promise<{ orderId: string; charged: number; paymentState: PaymentState }[]> {
  const { data, error } = await supabase.rpc("settle_vendor_unpaid_orders", { p_vendor_id: vendorId });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const settled = rows
    .filter((r) => Number(r.charged) > 0)
    .map((r) => ({ orderId: r.order_id as string, charged: Number(r.charged), paymentState: r.payment_state as PaymentState }));

  // Auto-clear overdraft requests for any order that just became fully paid.
  const paidOrderIds = rows.filter((r) => r.payment_state === "paid").map((r) => r.order_id as string);
  if (paidOrderIds.length > 0) {
    await supabase.from("overdraft_requests").update({ status: "approved" }).in("order_id", paidOrderIds).eq("status", "pending");
    await supabase.from("orders").update({ overdraft_status: null }).in("id", paidOrderIds);
  }

  return settled;
}

/**
 * Opens an overdraft request for an order that didn't get fully paid at
 * acceptance time. Surfaced through the existing support-chat system (a
 * new ticket, clearly labeled) so admin sees it in the normal Support
 * queue rather than a separate system, per the "reuse chat support"
 * requirement — the structured fields live in `overdraft_requests` and the
 * chat thread is just the human-readable notification/audit trail.
 */
export async function openOverdraftRequest(opts: {
  orderId: string;
  vendorId: string;
  orderAmount: number;
  walletBalanceAtRequest: number;
  requestedAmount: number;
}): Promise<string> {
  const shortfall = Math.round((opts.requestedAmount) * 100) / 100;

  const vendor = await getUserById(opts.vendorId);
  const { chat } = await startChat(opts.vendorId);
  await addMessage(
    chat.id,
    "user",
    `OVERDRAFT REQUEST\n\nOrder: #${opts.orderId}\nOrder Amount: $${opts.orderAmount.toFixed(2)}\nCurrent Balance: $${opts.walletBalanceAtRequest.toFixed(2)}\nRequested Credit: $${shortfall.toFixed(2)}\nStatus: Pending`
  );
  await supabase.from("support_chats").update({ category: "overdraft", subject: `Overdraft — Order #${opts.orderId}` }).eq("id", chat.id);

  const { data, error } = await supabase
    .from("overdraft_requests")
    .insert({
      order_id: opts.orderId,
      vendor_id: opts.vendorId,
      order_amount: opts.orderAmount,
      wallet_balance_at_request: opts.walletBalanceAtRequest,
      requested_amount: shortfall,
      shortfall_amount: shortfall,
      status: "pending",
      chat_id: chat.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("orders").update({ overdraft_status: "pending" }).eq("id", opts.orderId);

  await sendAdminNotification({
    title: `🧾 Overdraft Request — Order #${opts.orderId}`,
    message: `Vendor: ${vendor?.name} (${vendor?.email})\nOrder Amount: $${opts.orderAmount.toFixed(2)}\nBalance at request: $${opts.walletBalanceAtRequest.toFixed(2)}\nShortfall: $${shortfall.toFixed(2)}\n\nReview in Admin → Support (or Admin → Wallet → Overdraft Requests).`,
    type: "overdraft_request",
  });

  return (data as { id: string }).id;
}

export interface OverdraftRequestRow {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName?: string;
  vendorEmail?: string;
  orderAmount: number;
  walletBalanceAtRequest: number;
  requestedAmount: number;
  shortfallAmount: number;
  status: "pending" | "approved" | "rejected";
  adminId?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

function mapOverdraftRequest(r: Record<string, unknown>): OverdraftRequestRow {
  const user = (r.users ?? {}) as Record<string, unknown>;
  return {
    id: r.id as string,
    orderId: r.order_id as string,
    vendorId: r.vendor_id as string,
    vendorName: user.name as string | undefined,
    vendorEmail: user.email as string | undefined,
    orderAmount: Number(r.order_amount),
    walletBalanceAtRequest: Number(r.wallet_balance_at_request),
    requestedAmount: Number(r.requested_amount),
    shortfallAmount: Number(r.shortfall_amount),
    status: r.status as OverdraftRequestRow["status"],
    adminId: (r.admin_id as string) ?? null,
    decidedAt: (r.decided_at as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function listOverdraftRequests(status?: "pending" | "approved" | "rejected"): Promise<OverdraftRequestRow[]> {
  let q = supabase.from("overdraft_requests").select("*, users:vendor_id(name,email)").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map((r) => mapOverdraftRequest(r as Record<string, unknown>));
}

/**
 * Admin approve/reject. Approval does NOT mark the order paid — it only
 * records that the vendor is allowed to keep going without full payment
 * yet (the order is already proceeding regardless; see acceptOrderCharge).
 * Rejection doesn't reverse the order either, since orders are never
 * blocked by balance — it just records the decision and notifies the
 * vendor, per the spec's explicit "approval != paid" rule.
 */
export async function decideOverdraftRequest(id: string, decision: "approved" | "rejected", adminId: string): Promise<void> {
  const { data } = await supabase.from("overdraft_requests").select("*").eq("id", id).single();
  const row = data as Record<string, unknown> | null;
  if (!row) throw new Error("Overdraft request not found");

  await supabase.from("overdraft_requests").update({
    status: decision, admin_id: adminId, decided_at: new Date().toISOString(),
  }).eq("id", id);
  await supabase.from("orders").update({ overdraft_status: decision }).eq("id", row.order_id as string);

  const chatId = row.chat_id as string | null;
  if (chatId) {
    await addMessage(chatId, "agent", decision === "approved"
      ? `Overdraft approved. You can keep working with this order — please recharge your wallet via Cash App or Zelle to settle the outstanding balance.`
      : `Overdraft request declined. Please recharge your wallet via Cash App or Zelle to settle the outstanding balance on this order.`);
  }

  const vendor = await getUserById(row.vendor_id as string);
  const admin = await getUserById(adminId);
  if (vendor?.email) {
    await sendOverdraftDecisionEmail({
      vendorEmail: vendor.email,
      vendorName: vendor.name ?? "there",
      orderId: row.order_id as string,
      shortfall: Number(row.shortfall_amount),
      decision,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com",
    }).catch((err) => console.error("[overdraft] vendor notify failed", err));
  }
  await sendAdminNotification({
    title: `Overdraft ${decision} by ${admin?.name ?? adminId}`,
    message: `Order ${row.order_id} — $${Number(row.shortfall_amount).toFixed(2)} shortfall — vendor ${vendor?.email ?? row.vendor_id}`,
    type: "overdraft_decision",
  }).catch(() => {});
}
