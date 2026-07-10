import { NextRequest, NextResponse } from "next/server";
import {
  deactivateWalletPlan,
  getWalletPlanById,
  updateWalletPlan,
} from "@/lib/walletBilling";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const plan = await getWalletPlanById(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!plan.active && request.cookies.get("user_role")?.value !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

/** PATCH — admin updates name/amount/active/sort. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getWalletPlanById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  try {
    const plan = await updateWalletPlan(id, {
      name: body.name,
      amountUsd: body.amountUsd ?? body.amount,
      credits: body.credits,
      description: body.description,
      active: body.active,
      sortOrder: body.sortOrder,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update plan" },
      { status: 400 },
    );
  }
}

/** DELETE — soft-deactivate (keeps FK history). */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getWalletPlanById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deactivateWalletPlan(id);
  return NextResponse.json({ ok: true });
}
