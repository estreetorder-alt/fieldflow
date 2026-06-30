import { NextRequest, NextResponse } from "next/server";
import { getPaymentLinks, upsertPaymentLink } from "@/lib/db";
import { sendNtfyNotification } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const links = await getPaymentLinks();
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await request.json();
  const { label, url, amount, description } = body;
  if (!label || !url) return NextResponse.json({ error: "label and url required" }, { status: 400 });
  const link = await upsertPaymentLink({ label, url, amount: amount ? Number(amount) : undefined, description: description ?? "" });
  return NextResponse.json({ link }, { status: 201 });
}
