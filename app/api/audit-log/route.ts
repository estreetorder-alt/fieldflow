import { NextRequest, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/db";
import { isAdminTier } from "@/lib/adminAccess";

// Read-only history of admin actions. Every admin-tier role (top admin and
// all four sub-admins) can view it — it's oversight, not a mutation surface,
// so there's no reason to scope it narrower than "any admin login".
export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (!isAdminTier(userRole)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const log = await getAuditLog(200);
  return NextResponse.json({ log });
}
