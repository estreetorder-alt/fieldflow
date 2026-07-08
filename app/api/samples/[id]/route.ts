import { NextRequest, NextResponse } from "next/server";
import { reviewSample, getUserById, logAdminAction } from "@/lib/db";
import { sendAgentApprovedEmail, sendAgentRejectedEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const { decision, notes, agentId } = await request.json();
  if (!["approved", "rejected"].includes(decision))
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });

  await reviewSample(id, decision, userId, notes ?? "");

  const admin = await getUserById(userId);
  await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: `sample.${decision}`, targetType: "sample", targetId: id, details: { agentId, notes: notes ?? "" } });

  // Email the agent about the decision
  if (agentId) {
    const agent = await getUserById(agentId);
    if (agent?.email) {
      if (decision === "approved") {
        await sendAgentApprovedEmail({ email: agent.email, name: agent.name });
      } else {
        await sendAgentRejectedEmail({ email: agent.email, name: agent.name }, notes);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
