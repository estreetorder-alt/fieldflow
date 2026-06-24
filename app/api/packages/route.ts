import { NextRequest, NextResponse } from "next/server";
import { getPhotoPackages } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const packages = await getPhotoPackages();
  return NextResponse.json({ packages });
}
