import { NextRequest, NextResponse } from "next/server";
import { createSetupCheckout, isWhopConfigured } from "@/lib/whop";
import { listPaymentMethods } from "@/lib/walletBilling";

/** GET — list saved cards for the logged-in client. */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const methods = await listPaymentMethods(userId);
  return NextResponse.json({
    methods,
    cardConnected: methods.length > 0,
  });
}

/**
 * POST — start Whop setup checkout to save a card (no charge).
 * Body: { purpose?: "connect_card" | "add_card" }
 * Returns: { success: true, checkout_url }
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  if (!isWhopConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  let purpose: "connect_card" | "add_card" = "connect_card";
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.purpose === "add_card") purpose = "add_card";
  } catch {
    /* empty body ok */
  }

  try {
    const { checkoutUrl, checkoutId } = await createSetupCheckout({
      purpose,
      redirectPath: `/client/wallet?card=${purpose === "add_card" ? "added" : "connected"}`,
      metadata: {
        account_id: userId,
        userId,
        purpose,
      },
    });

    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl,
      url: checkoutUrl,
      checkoutId,
    });
  } catch (err) {
    console.error("[wallet/connect-card] Whop setup failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start card setup" },
      { status: 502 },
    );
  }
}
