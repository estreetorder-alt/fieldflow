import { NextRequest, NextResponse } from "next/server";
import { listAllTickets } from "@/lib/supportChat";
import { canAccessScope } from "@/lib/adminAccess";

// GET — admin ticket queue (all users' support chats + one-shot requests).
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !(userRole === "admin" || canAccessScope(userRole, "support")))
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const status = searchParams.get("status") ?? undefined;

  const { items, total } = await listAllTickets({ page, pageSize, status });
  return NextResponse.json({ items, total, page, pageSize });
}
