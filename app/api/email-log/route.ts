import { NextRequest, NextResponse } from "next/server";
import { getEmailLog, addEmailLog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const emails = await getEmailLog();
  return NextResponse.json({ emails });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  await addEmailLog({ type: "photo_email", to: userId, subject: `Photos from order ${body.orderId}`, body: `Photo IDs: ${body.photoIds?.join(", ")}` });
  return NextResponse.json({ ok: true });
}
