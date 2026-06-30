import { NextRequest, NextResponse } from "next/server";
import { upsertPaymentLink, deletePaymentLink } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  await upsertPaymentLink({ id, ...body });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  await deletePaymentLink(id);
  return NextResponse.json({ ok: true });
}
