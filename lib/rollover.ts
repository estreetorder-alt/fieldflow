import { supabase } from "./supabase";
import { getWalletBalance, getUserById, updateUser } from "./db";

// Req. 11 — rollover credit is a per-vendor trust tier (admin must flag
// `rolloverEligible`), separate from the always-on wallet overdraft
// (`walletCreditLimit`). It lets a trusted vendor accept an order that
// exceeds their current wallet balance; the shortfall is recorded as a
// per-order "unpaid" flag and automatically settles the next time that
// vendor's wallet is topped up (see settleRolloverOnTopup below).
//
// Req. 13 — by default this is a ONE-TIME allowance, not a recurring one:
// `rolloverUsed` flips true the first time it's consumed and blocks further
// use until an admin manually resets it, unless the admin has explicitly
// set `rolloverRecurring = true` for that vendor as an exception.

export interface RolloverHoldResult {
  held: boolean;
  usedRollover: boolean;
  rolloverAmount?: number;
}

/**
 * Attempt to hold `amount` from a vendor's wallet for an order. If the plain
 * balance (+ any standing wallet_credit_limit overdraft) isn't enough, but
 * the vendor is rollover-eligible and still has their allowance available,
 * the order proceeds anyway: available balance is drained to 0 and the
 * shortfall is flagged on the order as rollover_unpaid for later settlement.
 */
export async function tryHoldWithRollover(userId: string, orderId: string, amount: number): Promise<RolloverHoldResult> {
  const current = await getWalletBalance(userId);
  const { data: userRow } = await supabase.from("users").select("wallet_credit_limit").eq("id", userId).single();
  const creditLimit = Number((userRow as Record<string, unknown> | null)?.wallet_credit_limit ?? 0);

  if (current + creditLimit >= amount) {
    // Plain hold covers it — no rollover needed.
    const newBalance = current - amount;
    await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
    await supabase.from("wallet_transactions").insert({
      user_id: userId, type: "hold", amount, balance_after: newBalance,
      description: `Hold for order ${orderId}`, order_id: orderId, status: "confirmed", purpose: "order_hold",
    });
    await supabase.from("orders").update({ wallet_hold_amount: amount, payment_status: "confirmed" }).eq("id", orderId);
    return { held: true, usedRollover: false };
  }

  const user = await getUserById(userId);
  const eligible = user?.rolloverEligible === true;
  const alreadyUsed = user?.rolloverUsed === true && user?.rolloverRecurring !== true;
  const limit = Number(user?.rolloverLimit ?? 0);
  const shortfall = Math.round((amount - current - creditLimit) * 100) / 100;

  if (!eligible || alreadyUsed || shortfall > limit) {
    return { held: false, usedRollover: false };
  }

  // Proceed on rollover credit: drain whatever balance/credit exists to 0,
  // flag the order as carrying the unpaid shortfall.
  const balanceUsed = current + creditLimit;
  const newBalance = current - balanceUsed; // = -creditLimit, i.e. fully drained
  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
  await supabase.from("wallet_transactions").insert({
    user_id: userId, type: "hold", amount: balanceUsed, balance_after: newBalance,
    description: `Hold for order ${orderId} (partial — $${shortfall.toFixed(2)} on rollover credit)`,
    order_id: orderId, status: "confirmed", purpose: "order_hold",
  });
  await supabase.from("orders").update({
    wallet_hold_amount: amount,
    payment_status: "confirmed",
    rollover_unpaid: true,
    rollover_amount: shortfall,
  }).eq("id", orderId);

  if (user?.rolloverRecurring !== true) {
    await updateUser(userId, { rolloverUsed: true });
  }

  return { held: true, usedRollover: true, rolloverAmount: shortfall };
}

/**
 * Called after a wallet top-up confirms (checkout webhook, manual admin
 * credit, or auto top-up). Walks the vendor's outstanding rollover_unpaid
 * orders oldest-first and settles as many as the fresh balance covers.
 */
export async function settleRolloverOnTopup(userId: string): Promise<{ settledCount: number; settledTotal: number }> {
  const { data: unpaidOrders } = await supabase
    .from("orders")
    .select("id, rollover_amount, created_at")
    .eq("client_id", userId)
    .eq("rollover_unpaid", true)
    .order("created_at", { ascending: true });

  const rows = (unpaidOrders ?? []) as { id: string; rollover_amount: number; created_at: string }[];
  if (rows.length === 0) return { settledCount: 0, settledTotal: 0 };

  let balance = await getWalletBalance(userId);
  let settledCount = 0;
  let settledTotal = 0;

  for (const row of rows) {
    const owed = Number(row.rollover_amount ?? 0);
    if (owed <= 0) {
      await supabase.from("orders").update({ rollover_unpaid: false, rollover_settled_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }
    if (balance < owed) break; // settle oldest-first; stop once balance can't cover the next one

    balance -= owed;
    settledCount += 1;
    settledTotal += owed;

    await supabase.from("users").update({ wallet_balance: balance }).eq("id", userId);
    await supabase.from("wallet_transactions").insert({
      user_id: userId, type: "hold", amount: owed, balance_after: balance,
      description: `Rollover credit settled for order ${row.id}`,
      order_id: row.id, status: "confirmed", purpose: "rollover_settle",
    });
    await supabase.from("orders").update({
      rollover_unpaid: false,
      rollover_settled_at: new Date().toISOString(),
    }).eq("id", row.id);
  }

  return { settledCount, settledTotal };
}

/** Admin: manually reset a vendor's one-time rollover allowance so they can use it again. */
export async function resetRolloverAllowance(userId: string): Promise<void> {
  await updateUser(userId, { rolloverUsed: false });
}
