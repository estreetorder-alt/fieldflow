import { NextRequest, NextResponse } from "next/server";
import { listPaymentMethods } from "@/lib/walletBilling";

/**
 * GET — list saved cards for the logged-in client.
 * (Legacy endpoint — card saving is no longer supported; returns empty list.)
 */
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
 * POST — previously started a Whop card-save flow.
 * Payment method saving is no longer supported; payments go directly through pd.cash.
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Saved cards are no longer supported. Please use the pd.cash payment link to top up your wallet directly.",
    },
    { status: 410 },
  );
}
