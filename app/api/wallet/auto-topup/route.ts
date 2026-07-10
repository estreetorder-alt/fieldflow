import { NextRequest, NextResponse } from "next/server";
import { maybeRunAutoTopup } from "@/lib/autoTopup";
import {
  getAutoTopupPrefs,
  getDefaultPaymentMethod,
  listActiveWalletPlans,
  upsertAutoTopupPrefs,
} from "@/lib/walletBilling";

/** GET — current auto top-up prefs + whether a card is available. */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [prefs, card, plans] = await Promise.all([
    getAutoTopupPrefs(userId),
    getDefaultPaymentMethod(userId),
    listActiveWalletPlans(),
  ]);

  return NextResponse.json({
    prefs: prefs ?? {
      userId,
      enabled: false,
      thresholdUsd: 25,
      topupAmountUsd: 50,
      planId: null,
      paymentMethodId: null,
      cooldownUntil: null,
      lastAttemptAt: null,
      lastStatus: null,
      lastError: null,
      updatedAt: null,
    },
    hasCard: Boolean(card),
    defaultCard: card
      ? { id: card.id, brand: card.brand, last4: card.last4 }
      : null,
    plans,
  });
}

/** POST — save prefs. Body: { enabled, thresholdUsd, topupAmountUsd, planId? } */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    enabled?: boolean;
    thresholdUsd?: number;
    topupAmountUsd?: number;
    planId?: string | null;
    paymentMethodId?: string | null;
    runNow?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const enabled = Boolean(body.enabled);
  const thresholdUsd = Number(body.thresholdUsd ?? 25);
  const topupAmountUsd = Number(body.topupAmountUsd ?? 50);

  if (enabled) {
    const card = await getDefaultPaymentMethod(userId);
    if (!card) {
      return NextResponse.json(
        { error: "Connect a card before enabling auto top-up" },
        { status: 400 },
      );
    }
  }

  try {
    const prefs = await upsertAutoTopupPrefs({
      userId,
      enabled,
      thresholdUsd,
      topupAmountUsd,
      planId: body.planId ?? null,
      paymentMethodId: body.paymentMethodId ?? null,
    });

    let autoResult = null;
    if (enabled && body.runNow !== false) {
      autoResult = await maybeRunAutoTopup(userId);
    }

    return NextResponse.json({ prefs, autoResult });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save preferences" },
      { status: 400 },
    );
  }
}
