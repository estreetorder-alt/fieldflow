import { NextRequest, NextResponse } from "next/server";
import { getPendingSignups } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["admin", "sub_admin_users"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pending = await getPendingSignups();
  return NextResponse.json({
    signups: pending.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone,
      company: u.company, createdAt: u.createdAt,
    })),
  });
}
