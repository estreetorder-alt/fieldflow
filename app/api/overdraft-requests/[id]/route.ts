import { NextRequest, NextResponse } from "next/server";
import { decideOverdraftRequest } from "@/lib/orderPayments";
import { canAccessScope } from "@/lib/adminAccess";
import { logAdminAction, getUserById } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || !(userRole === "admin" || canAccessScope(userRole, "finance"))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const { id } = await params;
  const { decision } = await request.json();
  if (!["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
  }

  await decideOverdraftRequest(id, decision, adminId);

  const admin = await getUserById(adminId);
  await logAdminAction({
    actorId: adminId, actorName: admin?.name ?? "Admin",
    action: `overdraft.${decision}`, targetType: "overdraft_request", targetId: id,
  });

  return NextResponse.json({ ok: true });
}
