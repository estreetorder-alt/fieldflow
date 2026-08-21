import { NextRequest, NextResponse } from "next/server";
import { listOverdraftRequests } from "@/lib/orderPayments";
import { canAccessScope } from "@/lib/adminAccess";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (!(userRole === "admin" || canAccessScope(userRole, "finance"))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const status = request.nextUrl.searchParams.get("status") as "pending" | "approved" | "rejected" | null;
  const requests = await listOverdraftRequests(status ?? undefined);
  return NextResponse.json({ requests });
}
