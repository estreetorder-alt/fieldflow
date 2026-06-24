import { NextRequest, NextResponse } from "next/server";
import { getSubAccounts, createUser, getUserByEmail } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });
  const subs = await getSubAccounts(userId);
  return NextResponse.json({ subAccounts: subs.map(u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })) });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });
  const { name, email, password } = await request.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  const exists = await getUserByEmail(email);
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const sub = await createUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
    email, password, role: "client", name, phone: "",
  });
  // Set parent_client_id
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("users").update({ parent_client_id: userId }).eq("id", sub.id);
  return NextResponse.json({ subAccount: { id: sub.id, name: sub.name, email: sub.email } }, { status: 201 });
}
