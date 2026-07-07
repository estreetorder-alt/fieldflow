import { NextRequest, NextResponse } from "next/server";
import { getAgents, getAllUsers } from "@/lib/db";
import { resolveAgentState } from "@/lib/zipState";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await getAgents();
  const agentList = agents
    .map(u => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone,
      coverageZone: u.coverageZone ?? "", vehicle: u.vehicle ?? "",
      available: u.available ?? false, rating: u.rating ?? 5.0,
      bio: u.bio ?? "", totalEarnings: u.totalEarnings ?? 0,
      pendingPayout: u.pendingPayout ?? 0, completedJobs: u.completedJobs ?? 0,
      createdAt: u.createdAt,
      state: resolveAgentState(u.coverageZone),
    }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

  if (request.nextUrl.searchParams.get("all") === "1" && userRole === "admin") {
    const all = await getAllUsers();
    const allUsers = all.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      phone: u.phone, company: u.company, createdAt: u.createdAt,
      accountActive: u.accountActive, suspended: u.suspended,
    }));
    return NextResponse.json({ agents: agentList, allUsers });
  }

  return NextResponse.json({ agents: agentList });
}
