import { getWalletBalance } from "@/lib/db";
import { createOffSessionPayment, isWhopConfigured } from "@/lib/whop";
import {
  attachCheckoutToTopup,
  clearAutoTopupCooldownOnSuccess,
  confirmWalletTopup,
  createPendingWalletTopup,
  failWalletTopup,
  getAutoTopupPrefs,
  getDefaultPaymentMethod,
  getWalletPlanById,
  listPaymentMethods,
  markAutoTopupAttempt,
} from "@/lib/walletBilling";
import { supabase } from "@/lib/supabase";

export type AutoTopupResult =
  | { ran: false; reason: string }
  | { ran: true; txId: string; paymentId: string; amount: number; creditedNow: boolean };

const DEFAULT_COOLDOWN_MIN = 15;

/**
 * If the client's balance is at/below their threshold and auto top-up is enabled,
 * charge their saved card off-session. Wallet credit is applied via webhook
 * (and immediately if Whop returns a paid status).
 */
export async function maybeRunAutoTopup(userId: string): Promise<AutoTopupResult> {
  if (!isWhopConfigured()) {
    return { ran: false, reason: "whop_not_configured" };
  }

  const prefs = await getAutoTopupPrefs(userId);
  if (!prefs?.enabled) {
    return { ran: false, reason: "disabled" };
  }

  if (prefs.cooldownUntil && new Date(prefs.cooldownUntil).getTime() > Date.now()) {
    return { ran: false, reason: "cooldown" };
  }

  const balance = await getWalletBalance(userId);
  if (balance > prefs.thresholdUsd) {
    return { ran: false, reason: "above_threshold" };
  }

  let amount = prefs.topupAmountUsd;
  let planId: string | null = prefs.planId;

  if (planId) {
    const plan = await getWalletPlanById(planId);
    if (plan?.active) {
      amount = plan.amountUsd;
    } else {
      planId = null;
    }
  }

  if (!Number.isFinite(amount) || amount < 1) {
    await markAutoTopupAttempt({
      userId,
      status: "failed",
      error: "Invalid top-up amount",
      cooldownMinutes: DEFAULT_COOLDOWN_MIN,
    });
    return { ran: false, reason: "invalid_amount" };
  }

  const methods = await listPaymentMethods(userId);
  const chosen =
    (prefs.paymentMethodId ? methods.find((m) => m.id === prefs.paymentMethodId) : null) ??
    methods.find((m) => m.isDefault) ??
    methods[0] ??
    (await getDefaultPaymentMethod(userId));

  if (!chosen?.whopMemberId || !chosen.whopPaymentMethodId) {
    await markAutoTopupAttempt({
      userId,
      status: "failed",
      error: "No saved card — connect a card first",
      cooldownMinutes: DEFAULT_COOLDOWN_MIN,
    });
    return { ran: false, reason: "no_card" };
  }

  // Stamp cooldown before calling Whop so parallel requests don't double-charge
  await markAutoTopupAttempt({
    userId,
    status: "pending",
    error: null,
    cooldownMinutes: DEFAULT_COOLDOWN_MIN,
  });

  const txId = await createPendingWalletTopup({
    userId,
    amount,
    purpose: "auto_topup",
    planId,
    description: `Auto top-up $${amount.toFixed(2)}`,
    metadata: {
      account_id: userId,
      purpose: "auto_topup",
      threshold: String(prefs.thresholdUsd),
    },
  });

  await supabase
    .from("wallet_transactions")
    .update({ payment_method_id: chosen.id })
    .eq("id", txId);

  try {
    const { paymentId, status } = await createOffSessionPayment({
      amountUsd: amount,
      title: `Snapect Auto Top-up $${amount.toFixed(2)}`,
      description: "Automatic wallet credit (1 USD = 1 credit)",
      memberId: chosen.whopMemberId,
      paymentMethodId: chosen.whopPaymentMethodId,
      metadata: {
        account_id: userId,
        userId,
        purpose: "auto_topup",
        tx_id: txId,
        walletTxId: txId,
        plan_id: planId ?? "",
        credits: String(amount),
        walletTopup: "true",
      },
    });

    await attachCheckoutToTopup(txId, paymentId);

    const paidNow =
      status === "paid" ||
      status === "succeeded" ||
      status === "complete" ||
      status === "completed";

    let creditedNow = false;
    if (paidNow) {
      const result = await confirmWalletTopup({ txId, whopPaymentId: paymentId });
      creditedNow = result.credited;
      if (result.credited || result.alreadyDone) {
        await clearAutoTopupCooldownOnSuccess(userId);
      }
    }

    await markAutoTopupAttempt({
      userId,
      status: paidNow ? "success" : "pending",
      error: null,
      cooldownMinutes: DEFAULT_COOLDOWN_MIN,
    });

    return { ran: true, txId, paymentId, amount, creditedNow };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auto top-up charge failed";
    await failWalletTopup(txId, msg);
    await markAutoTopupAttempt({
      userId,
      status: "failed",
      error: msg,
      cooldownMinutes: DEFAULT_COOLDOWN_MIN,
    });
    return { ran: false, reason: msg };
  }
}
