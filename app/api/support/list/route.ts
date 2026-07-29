import { NextRequest, NextResponse } from "next/server";
import { listForUser } from "@/lib/supportChat";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(20, Math.max(1, Number(searchParams.get("pageSize") ?? "5") || 5));

  const { items, total } = await listForUser(userId, { page, pageSize });
  return NextResponse.json({ items, total, page, pageSize });
}
