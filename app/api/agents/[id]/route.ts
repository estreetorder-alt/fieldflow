import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const userId = _req.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent: {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    coverageZone: user.coverageZone, vehicle: user.vehicle,
    available: user.available, rating: user.rating, bio: user.bio,
    totalEarnings: user.totalEarnings, pendingPayout: user.pendingPayout,
    completedJobs: user.completedJobs, grade: user.grade,
    approved: user.approved, accountActive: user.accountActive,
    backgroundCheckStatus: user.backgroundCheckStatus, backgroundCheckNotes: user.backgroundCheckNotes,
    smsOptIn: user.smsOptIn,
  }});
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Agent can only update themselves; admin can update anyone
  if (userRole !== "admin" && userId !== id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const allowed: Record<string, unknown> = {};

  if (body.available !== undefined) allowed.available = body.available;
  if (body.bio !== undefined) allowed.bio = body.bio;
  if (body.phone !== undefined) allowed.phone = body.phone;
  if (body.coverageZone !== undefined) allowed.coverageZone = body.coverageZone;
  if (body.vehicle !== undefined) allowed.vehicle = body.vehicle;
  if (body.smsOptIn !== undefined) allowed.smsOptIn = body.smsOptIn;

  // Admin-only fields
  if (userRole === "admin") {
    if (body.rating !== undefined) allowed.rating = body.rating;
    if (body.pendingPayout !== undefined) allowed.pendingPayout = body.pendingPayout;
    if (body.backgroundCheckStatus !== undefined) allowed.backgroundCheckStatus = body.backgroundCheckStatus;
    if (body.backgroundCheckNotes !== undefined) allowed.backgroundCheckNotes = body.backgroundCheckNotes;
  }

  try {
    if (Object.keys(allowed).length > 0) await updateUser(id, allowed);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
