import { NextRequest, NextResponse } from "next/server";
import {
  createWalletPlan,
  listActiveWalletPlans,
  listAllWalletPlans,
} from "@/lib/walletBilling";

/** GET — clients see active plans; admin can pass ?all=1 for inactive too. */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = request.nextUrl.searchParams.get("all") === "1";
  if (all && userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  if (!["client", "admin"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = all ? await listAllWalletPlans() : await listActiveWalletPlans();
  return NextResponse.json({ plans, currency: "usd" });
}

/** POST — admin creates a USD wallet credit plan (stored in our DB only). */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: {
    name?: string;
    amountUsd?: number;
    amount?: number;
    credits?: number;
    description?: string;
    active?: boolean;
    sortOrder?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amountUsd ?? body.amount);
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
    return NextResponse.json({ error: "amountUsd must be between $0.01 and $50,000" }, { status: 400 });
  }

  try {
    const plan = await createWalletPlan({
      name: body.name,
      amountUsd: amount,
      credits: body.credits,
      description: body.description,
      active: body.active,
      sortOrder: body.sortOrder,
      createdBy: userId,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create plan" },
      { status: 400 },
    );
  }
}
