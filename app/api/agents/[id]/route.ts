import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent: {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    coverageZone: user.coverageZone, vehicle: user.vehicle,
    available: user.available, rating: user.rating, bio: user.bio,
    totalEarnings: user.totalEarnings, pendingPayout: user.pendingPayout,
    completedJobs: user.completedJobs,
  }});
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const updates: Parameters<typeof updateUser>[1] = {};

  if (body.available !== undefined) updates.available = body.available;
  if (body.rating !== undefined) updates.rating = Number(body.rating);
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.coverageZone !== undefined) updates.coverageZone = body.coverageZone;
  if (body.vehicle !== undefined) updates.vehicle = body.vehicle;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.markPaid) updates.pendingPayout = 0;

  await updateUser(id, updates);
  return NextResponse.json({ ok: true });
}
