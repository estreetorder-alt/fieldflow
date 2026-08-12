import { NextRequest, NextResponse } from "next/server";
import { createGhostAgent, getAgents } from "@/lib/db";

// Req. 1/4 — ghost agents are admin-created stand-ins used to cover
// coverage gaps where no self-registered agent exists yet. Only admin (or
// scoped sub_admin_users, who manage the roster) can create them. The
// ghost_admin_label is an internal note ("John's cousin — Dallas TX") that
// must never reach any vendor-facing or agent-facing endpoint.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["admin", "sub_admin_users"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, ghostAdminLabel, coverageZone, phone } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!ghostAdminLabel?.trim()) return NextResponse.json({ error: "An internal admin label is required to identify who this ghost agent really is" }, { status: 400 });

  const ghost = await createGhostAgent({
    name: name.trim(),
    ghostAdminLabel: ghostAdminLabel.trim(),
    coverageZone: coverageZone ?? "",
    phone: phone ?? "",
    createdBy: userId,
  });

  return NextResponse.json({
    agent: { id: ghost.id, name: ghost.name, agentType: ghost.agentType, ghostAdminLabel: ghost.ghostAdminLabel, coverageZone: ghost.coverageZone },
  }, { status: 201 });
}

// List all agents with agent_type + admin-only ghost label included — this
// route is admin-only, unlike the general agents list which strips it.
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["admin", "sub_admin_users", "sub_admin_orders"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agents = await getAgents();
  return NextResponse.json({
    agents: agents.map(a => ({
      id: a.id, name: a.name, email: a.email, phone: a.phone,
      agentType: a.agentType ?? "self_registered",
      ghostAdminLabel: a.agentType === "ghost" ? (a.ghostAdminLabel ?? "") : undefined,
      ghostConvertedToUserId: a.ghostConvertedToUserId ?? null,
      coverageZone: a.coverageZone, available: a.available, suspended: a.suspended,
      rating: a.rating, completedJobs: a.completedJobs,
    })),
  });
}
