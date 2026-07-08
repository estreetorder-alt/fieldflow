import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value ?? "client";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "admin" && request.nextUrl.searchParams.get("all") === "1") {
    const { data } = await supabase.from("site_announcements").select("*").order("created_at", { ascending: false }).limit(50);
    return NextResponse.json({ announcements: data ?? [] });
  }

  const { data } = await supabase.from("site_announcements")
    .select("id, message, audience, created_at")
    .eq("active", true)
    .in("audience", ["all", userRole])
    .order("created_at", { ascending: false })
    .limit(1);
  return NextResponse.json({ announcement: data?.[0] ?? null });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { message, audience } = await request.json();
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
  // Deactivate previous announcements for this audience, then insert the new one
  await supabase.from("site_announcements").update({ active: false }).eq("audience", audience ?? "all");
  const { data, error } = await supabase.from("site_announcements")
    .insert({ message: message.trim(), audience: audience ?? "all", created_by: userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id, active } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabase.from("site_announcements").update({ active: !!active }).eq("id", id);
  return NextResponse.json({ ok: true });
}
