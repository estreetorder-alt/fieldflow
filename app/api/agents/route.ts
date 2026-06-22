import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;

  if (userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = store.users
    .filter((u) => u.role === "agent")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      available: u.available ?? true,
      rating: u.rating ?? 4.0,
      bio: u.bio ?? "",
      coverageZone: u.coverageZone ?? "",
      vehicle: u.vehicle ?? "",
      totalEarnings: u.totalEarnings ?? 0,
      pendingPayout: u.pendingPayout ?? 0,
      completedJobs: u.completedJobs ?? 0,
      createdAt: u.createdAt ?? "",
    }));

  return NextResponse.json({ agents });
}
