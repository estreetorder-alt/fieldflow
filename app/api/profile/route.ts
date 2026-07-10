import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";

// Own-profile management for all roles (vendor / agent / admin)
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ profile: {
    id: user.id, name: user.name, email: user.email, role: user.role,
    phone: user.phone ?? "", company: user.company ?? "",
    bio: user.bio ?? "", coverageZone: user.coverageZone ?? "", vehicle: user.vehicle ?? "",
  }});
}

export async function PATCH(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  // ── Password change (requires current password) ──
  if (body.newPassword) {
    if (!body.currentPassword)
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    if (String(body.newPassword).length < 6)
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    const ok = await verifyPassword(String(body.currentPassword), user.password);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    const { error } = await supabase.from("users")
      .update({ password: await hashPassword(String(body.newPassword)) }).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Basic profile fields ──
  const allowed: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) allowed.name = body.name.trim();
  if (body.phone !== undefined) allowed.phone = String(body.phone);
  if (body.company !== undefined) allowed.company = String(body.company);
  if (body.bio !== undefined) allowed.bio = String(body.bio);
  if (body.coverageZone !== undefined) allowed.coverageZone = String(body.coverageZone);
  if (body.vehicle !== undefined) allowed.vehicle = String(body.vehicle);

  try {
    if (Object.keys(allowed).length > 0) await updateUser(userId, allowed);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 });
  }

  // Keep the user_name cookie in sync if the name changed
  const res = NextResponse.json({ ok: true });
  if (allowed.name) {
    res.cookies.set("user_name", String(allowed.name), {
      path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}
