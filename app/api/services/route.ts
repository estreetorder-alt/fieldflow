import { NextRequest, NextResponse } from "next/server";
import { SERVICE_CATALOG } from "@/lib/services";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ catalog: SERVICE_CATALOG });
}
