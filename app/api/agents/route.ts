import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = store.users
    .filter(u => u.role === "agent")
    .map(u => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone,
      coverageZone: u.coverageZone ?? "", vehicle: u.vehicle ?? "",
      available: u.available ?? false, rating: u.rating ?? 5.0,
      bio: u.bio ?? "", totalEarnings: u.totalEarnings ?? 0,
      pendingPayout: u.pendingPayout ?? 0, completedJobs: u.completedJobs ?? 0,
      createdAt: u.createdAt,
    }));

  // Admin requesting all users
  const allParam = request.nextUrl.searchParams.get("all");
  if (allParam === "1" && userRole === "admin") {
    const allUsers = store.users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      phone: u.phone, company: u.company, createdAt: u.createdAt,
    }));
    return NextResponse.json({ agents, allUsers });
  }

  return NextResponse.json({ agents });
}
