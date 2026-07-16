import { supabase } from "./supabase";
import { getWalletBalance } from "./db";

export interface WalletPlan {
  id: string;
  name: string;
  amountUsd: number;
  credits: number;
  description: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PaymentMethodRow {
  id: string;
  userId: string;
  whopMemberId: string;
  whopPaymentMethodId: string;
  brand: string;
  last4: string;
  isDefault: boolean;
  createdAt: string;
}

function mapPlan(row: Record<string, unknown>): WalletPlan {
  return {
    id: row.id as string,
    name: row.name as string,
    amountUsd: Number(row.amount_usd),
    credits: Number(row.credits),
    description: (row.description as string) ?? "",
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at as string,
  };
}

function mapPm(row: Record<string, unknown>): PaymentMethodRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    whopMemberId: row.whop_member_id as string,
    whopPaymentMethodId: row.whop_payment_method_id as string,
    brand: (row.brand as string) ?? "",
    last4: (row.last4 as string) ?? "",
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as string,
  };
}

export async function listActiveWalletPlans(): Promise<WalletPlan[]> {
  const { data } = await supabase
    .from("wallet_plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((r) => mapPlan(r as Record<string, unknown>));
}

/** Admin: all plans including inactive. */
export async function listAllWalletPlans(): Promise<WalletPlan[]> {
  const { data } = await supabase
    .from("wallet_plans")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapPlan(r as Record<string, unknown>));
}

export async function getWalletPlanById(id: string): Promise<WalletPlan | null> {
  const { data } = await supabase.from("wallet_plans").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return mapPlan(data as Record<string, unknown>);
}

export async function createWalletPlan(opts: {
  name: string;
  amountUsd: number;
  credits?: number;
  description?: string;
  active?: boolean;
  sortOrder?: number;
  createdBy?: string | null;
}): Promise<WalletPlan> {
  const amount = Math.round(Number(opts.amountUsd) * 100) / 100;
  if (!opts.name?.trim()) throw new Error("Plan name is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");

  const credits = opts.credits != null ? Math.round(Number(opts.credits) * 100) / 100 : amount;
  const id = `wplan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

  const { data, error } = await supabase
    .from("wallet_plans")
    .insert({
      id,
      name: opts.name.trim(),
      amount_usd: amount,
      credits,
      description: (opts.description ?? "").trim(),
      active: opts.active !== false,
      sort_order: opts.sortOrder ?? 0,
      created_by: opts.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapPlan(data as Record<string, unknown>);
}

export async function updateWalletPlan(
  id: string,
  patch: {
    name?: string;
    amountUsd?: number;
    credits?: number;
    description?: string;
    active?: boolean;
    sortOrder?: number;
  },
): Promise<WalletPlan> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.active !== undefined) updates.active = patch.active;
  if (patch.sortOrder !== undefined) updates.sort_order = Number(patch.sortOrder);
  if (patch.amountUsd !== undefined) {
    const amount = Math.round(Number(patch.amountUsd) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
    updates.amount_usd = amount;
    // Keep 1:1 credits unless credits explicitly provided
    if (patch.credits === undefined) updates.credits = amount;
  }
  if (patch.credits !== undefined) {
    const credits = Math.round(Number(patch.credits) * 100) / 100;
    if (!Number.isFinite(credits) || credits <= 0) throw new Error("Credits must be greater than 0");
    updates.credits = credits;
  }

  const { data, error } = await supabase
    .from("wallet_plans")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapPlan(data as Record<string, unknown>);
}

/** Soft-delete: deactivate so history/FKs stay valid. */
export async function deactivateWalletPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from("wallet_plans")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createPendingWalletTopup(opts: {
  userId: string;
  amount: number;
  purpose: "plan_topup" | "custom_topup" | "auto_topup";
  description: string;
  planId?: string | null;
  whopCheckoutId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const txId = `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("wallet_transactions").insert({
    id: txId,
    user_id: opts.userId,
    type: "topup",
    purpose: opts.purpose,
    amount: opts.amount,
    balance_after: 0,
    description: opts.description,
    status: "pending",
    plan_id: opts.planId ?? null,
    whop_checkout_id: opts.whopCheckoutId ?? null,
    metadata: opts.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return txId;
}

export async function attachCheckoutToTopup(txId: string, checkoutId: string): Promise<void> {
  await supabase
    .from("wallet_transactions")
    .update({ whop_checkout_id: checkoutId })
    .eq("id", txId);
}

/**
 * Confirm a pending top-up once. Idempotent on tx status and whop_payment_id.
 * Returns whether balance was credited on this call.
 */
export async function confirmWalletTopup(opts: {
  txId: string;
  whopPaymentId?: string | null;
  failureMessage?: string | null;
}): Promise<{ credited: boolean; alreadyDone: boolean; userId?: string; amount?: number }> {
  const { data } = await supabase.from("wallet_transactions").select("*").eq("id", opts.txId).maybeSingle();
  const row = data as Record<string, unknown> | null;
  if (!row) return { credited: false, alreadyDone: false };

  if (row.status === "confirmed") {
    return { credited: false, alreadyDone: true, userId: row.user_id as string, amount: Number(row.amount) };
  }

  if (opts.whopPaymentId) {
    const { data: dup } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("whop_payment_id", opts.whopPaymentId)
      .eq("status", "confirmed")
      .maybeSingle();
    if (dup && (dup as { id: string }).id !== opts.txId) {
      return { credited: false, alreadyDone: true };
    }
  }

  const userId = row.user_id as string;
  const amount = Number(row.amount);
  const current = await getWalletBalance(userId);
  const newBalance = current + amount;

  const { error } = await supabase
    .from("wallet_transactions")
    .update({
      status: "confirmed",
      balance_after: newBalance,
      whop_payment_id: opts.whopPaymentId ?? row.whop_payment_id ?? null,
      confirmed_at: new Date().toISOString(),
      failure_message: null,
    })
    .eq("id", opts.txId)
    .eq("status", "pending");

  if (error) {
    // Unique conflict on whop_payment_id → already credited elsewhere
    if (error.code === "23505") return { credited: false, alreadyDone: true };
    throw new Error(error.message);
  }

  // Re-read to ensure we won the pending→confirmed race
  const { data: after } = await supabase.from("wallet_transactions").select("status").eq("id", opts.txId).single();
  if ((after as { status: string } | null)?.status !== "confirmed") {
    return { credited: false, alreadyDone: true, userId, amount };
  }

  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
  return { credited: true, alreadyDone: false, userId, amount };
}

export async function failWalletTopup(txId: string, failureMessage: string, whopPaymentId?: string | null): Promise<void> {
  await supabase
    .from("wallet_transactions")
    .update({
      status: "failed",
      failure_message: failureMessage.slice(0, 500),
      whop_payment_id: whopPaymentId ?? null,
    })
    .eq("id", txId)
    .in("status", ["pending"]);
}

/**
 * Admin-only: manually credit a vendor's wallet immediately (no checkout,
 * no webhook). Used for reconciliation when an automated payment (pd.cash
 * or otherwise) fails to confirm on its own — the admin records the note
 * for an audit trail and the credit applies right away.
 */
export async function adminManualCredit(opts: {
  userId: string;
  amount: number;
  note: string;
  adminId: string;
}): Promise<{ txId: string; newBalance: number }> {
  const amount = Math.round(Number(opts.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
  if (!opts.note?.trim()) throw new Error("A note is required for manual credit entries");

  const txId = `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const current = await getWalletBalance(opts.userId);
  const newBalance = current + amount;

  const { error } = await supabase.from("wallet_transactions").insert({
    id: txId,
    user_id: opts.userId,
    type: "topup",
    purpose: "admin_manual",
    amount,
    balance_after: newBalance,
    description: `Manual credit by admin — ${opts.note.trim()}`,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    metadata: { admin_id: opts.adminId, note: opts.note.trim() },
  });
  if (error) throw new Error(error.message);

  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", opts.userId);
  return { txId, newBalance };
}

export async function claimWebhookEvent(opts: {
  eventId: string;
  eventType: string;
  paymentId?: string | null;
  userId?: string | null;
  purpose?: string | null;
  payload?: unknown;
}): Promise<{ isNew: boolean }> {
  const { error } = await supabase.from("whop_webhook_events").insert({
    event_id: opts.eventId,
    event_type: opts.eventType,
    payment_id: opts.paymentId ?? null,
    user_id: opts.userId ?? null,
    purpose: opts.purpose ?? null,
    payload: opts.payload ?? {},
  });
  if (error) {
    if (error.code === "23505") return { isNew: false };
    throw new Error(error.message);
  }
  return { isNew: true };
}

export async function upsertPaymentMethod(opts: {
  userId: string;
  whopMemberId: string;
  whopPaymentMethodId: string;
  brand?: string;
  last4?: string;
  makeDefault?: boolean;
}): Promise<PaymentMethodRow> {
  const { data: existing } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("whop_payment_method_id", opts.whopPaymentMethodId)
    .maybeSingle();

  if (opts.makeDefault !== false) {
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", opts.userId);
  }

  if (existing) {
    const { data, error } = await supabase
      .from("payment_methods")
      .update({
        whop_member_id: opts.whopMemberId,
        brand: opts.brand ?? (existing as Record<string, unknown>).brand,
        last4: opts.last4 ?? (existing as Record<string, unknown>).last4,
        is_default: opts.makeDefault !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("users").update({ billing_card_connected: true }).eq("id", opts.userId);
    return mapPm(data as Record<string, unknown>);
  }

  const id = `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("payment_methods")
    .insert({
      id,
      user_id: opts.userId,
      whop_member_id: opts.whopMemberId,
      whop_payment_method_id: opts.whopPaymentMethodId,
      brand: opts.brand ?? "",
      last4: opts.last4 ?? "",
      is_default: true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("users").update({ billing_card_connected: true }).eq("id", opts.userId);
  return mapPm(data as Record<string, unknown>);
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethodRow[]> {
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapPm(r as Record<string, unknown>));
}

export async function getDefaultPaymentMethod(userId: string): Promise<PaymentMethodRow | null> {
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (data) return mapPm(data as Record<string, unknown>);
  const all = await listPaymentMethods(userId);
  return all[0] ?? null;
}

export interface AutoTopupPrefs {
  userId: string;
  enabled: boolean;
  thresholdUsd: number;
  topupAmountUsd: number;
  planId: string | null;
  paymentMethodId: string | null;
  cooldownUntil: string | null;
  lastAttemptAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

function mapAutoPrefs(row: Record<string, unknown>): AutoTopupPrefs {
  return {
    userId: row.user_id as string,
    enabled: Boolean(row.enabled),
    thresholdUsd: Number(row.threshold_usd ?? 25),
    topupAmountUsd: Number(row.topup_amount_usd ?? 50),
    planId: (row.plan_id as string) ?? null,
    paymentMethodId: (row.payment_method_id as string) ?? null,
    cooldownUntil: (row.cooldown_until as string) ?? null,
    lastAttemptAt: (row.last_attempt_at as string) ?? null,
    lastStatus: (row.last_status as string) ?? null,
    lastError: (row.last_error as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

export async function getAutoTopupPrefs(userId: string): Promise<AutoTopupPrefs | null> {
  const { data } = await supabase.from("wallet_auto_topup").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return mapAutoPrefs(data as Record<string, unknown>);
}

export async function upsertAutoTopupPrefs(opts: {
  userId: string;
  enabled: boolean;
  thresholdUsd: number;
  topupAmountUsd: number;
  planId?: string | null;
  paymentMethodId?: string | null;
}): Promise<AutoTopupPrefs> {
  const threshold = Math.round(Number(opts.thresholdUsd) * 100) / 100;
  const topup = Math.round(Number(opts.topupAmountUsd) * 100) / 100;
  if (!Number.isFinite(threshold) || threshold < 0) throw new Error("Invalid threshold");
  if (!Number.isFinite(topup) || topup < 1) throw new Error("Top-up amount must be at least $1");
  if (topup > 5000) throw new Error("Top-up amount cannot exceed $5,000");

  const payload = {
    user_id: opts.userId,
    enabled: opts.enabled,
    threshold_usd: threshold,
    topup_amount_usd: topup,
    plan_id: opts.planId ?? null,
    payment_method_id: opts.paymentMethodId ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("wallet_auto_topup")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapAutoPrefs(data as Record<string, unknown>);
}

export async function markAutoTopupAttempt(opts: {
  userId: string;
  status: "success" | "failed" | "skipped" | "pending";
  error?: string | null;
  cooldownMinutes?: number;
}): Promise<void> {
  const patch: Record<string, unknown> = {
    last_attempt_at: new Date().toISOString(),
    last_status: opts.status,
    last_error: opts.error ? opts.error.slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  };
  if (opts.status !== "skipped") {
    const cooldownMin = opts.cooldownMinutes ?? 15;
    patch.cooldown_until = new Date(Date.now() + cooldownMin * 60 * 1000).toISOString();
  }
  await supabase.from("wallet_auto_topup").update(patch).eq("user_id", opts.userId);
}

/** Clear cooldown after a successful webhook credit for auto_topup (optional soft reset). */
export async function clearAutoTopupCooldownOnSuccess(userId: string): Promise<void> {
  await supabase
    .from("wallet_auto_topup")
    .update({
      last_status: "success",
      last_error: null,
      cooldown_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export interface AdminWhopPaymentRow {
  txId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  purpose: string;
  status: string;
  description: string;
  planName: string | null;
  whopPaymentId: string | null;
  whopCheckoutId: string | null;
  failureMessage: string | null;
  confirmedAt: string | null;
  createdAt: string;
  webhookEventType: string | null;
  webhookEventId: string | null;
  webhookAt: string | null;
}

export interface AdminWhopWebhookRow {
  eventId: string;
  eventType: string;
  paymentId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  purpose: string | null;
  processedAt: string;
  createdAt: string;
}

/** Admin: Whop checkout / webhook wallet payments with user + linked webhook event. */
export async function listAdminWhopPayments(limit = 50): Promise<AdminWhopPaymentRow[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(`
      id, user_id, amount, purpose, status, description,
      whop_payment_id, whop_checkout_id, failure_message, confirmed_at, created_at, plan_id,
      users!wallet_transactions_user_id_fkey(name, email),
      wallet_plans(name)
    `)
    .or("whop_payment_id.not.is.null,whop_checkout_id.not.is.null")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const paymentIds = rows
    .map((r) => r.whop_payment_id as string | null)
    .filter((id): id is string => Boolean(id));

  const webhookByPayment = new Map<string, { event_id: string; event_type: string; processed_at: string }>();
  if (paymentIds.length > 0) {
    const { data: events } = await supabase
      .from("whop_webhook_events")
      .select("event_id, event_type, payment_id, processed_at")
      .in("payment_id", paymentIds);
    for (const ev of events ?? []) {
      const pid = (ev as { payment_id: string | null }).payment_id;
      if (pid) webhookByPayment.set(pid, ev as { event_id: string; event_type: string; processed_at: string });
    }
  }

  return rows.map((r) => {
    const user = r.users as { name?: string; email?: string } | null;
    const plan = r.wallet_plans as { name?: string } | null;
    const whopPaymentId = (r.whop_payment_id as string) ?? null;
    const webhook = whopPaymentId ? webhookByPayment.get(whopPaymentId) : undefined;
    return {
      txId: r.id as string,
      userId: r.user_id as string,
      userName: user?.name ?? "Unknown",
      userEmail: user?.email ?? "",
      amount: Number(r.amount),
      purpose: (r.purpose as string) ?? "topup",
      status: (r.status as string) ?? "pending",
      description: (r.description as string) ?? "",
      planName: plan?.name ?? null,
      whopPaymentId,
      whopCheckoutId: (r.whop_checkout_id as string) ?? null,
      failureMessage: (r.failure_message as string) ?? null,
      confirmedAt: (r.confirmed_at as string) ?? null,
      createdAt: r.created_at as string,
      webhookEventType: webhook?.event_type ?? null,
      webhookEventId: webhook?.event_id ?? null,
      webhookAt: webhook?.processed_at ?? null,
    };
  });
}

/** Admin: recent raw Whop webhook deliveries (all event types). */
export async function listAdminWhopWebhooks(limit = 50): Promise<AdminWhopWebhookRow[]> {
  const { data, error } = await supabase
    .from("whop_webhook_events")
    .select(`
      event_id, event_type, payment_id, user_id, purpose, processed_at, created_at,
      users(name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const user = row.users as { name?: string; email?: string } | null;
    return {
      eventId: row.event_id as string,
      eventType: row.event_type as string,
      paymentId: (row.payment_id as string) ?? null,
      userId: (row.user_id as string) ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      purpose: (row.purpose as string) ?? null,
      processedAt: row.processed_at as string,
      createdAt: row.created_at as string,
    };
  });
}
