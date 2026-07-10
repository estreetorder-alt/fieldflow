import { NextRequest, NextResponse } from "next/server";
import { listAdminWhopPayments, listAdminWhopWebhooks } from "@/lib/walletBilling";

/** GET — admin view of Whop wallet payments + webhook event log. */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)));

  try {
    const [payments, webhooks] = await Promise.all([
      listAdminWhopPayments(limit),
      listAdminWhopWebhooks(limit),
    ]);
    return NextResponse.json({ payments, webhooks });
  } catch (err) {
    console.error("[wallet/whop-activity]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load Whop activity" },
      { status: 500 },
    );
  }
}
