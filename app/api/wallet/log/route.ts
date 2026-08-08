import { NextRequest, NextResponse } from "next/server";
import { getAllWalletTransactions, updateWalletTransaction, getUserById } from "@/lib/db";

// Admin-only: full wallet + payment transaction log, and the ability to
// correct an entry after the fact. See lib/db.ts updateWalletTransaction
// for what editing does and doesn't affect.
export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const log = await getAllWalletTransactions(300);
  return NextResponse.json({ log });
}

export async function PATCH(request: NextRequest) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { id, amount, description, status } = body as { id?: string; amount?: number; description?: string; status?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = await getUserById(adminId);
  try {
    await updateWalletTransaction(id, { amount, description, status }, adminId, admin?.name ?? "Admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 });
  }
}
