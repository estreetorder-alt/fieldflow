import { NextRequest, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const log = await getAuditLog(200);
  return NextResponse.json({ log });
}
