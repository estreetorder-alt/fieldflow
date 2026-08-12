import { NextRequest, NextResponse } from "next/server";
import { approveSignup, rejectSignup, logAdminAction, getUserById } from "@/lib/db";
import { sendSignupApprovedEmail, sendSignupRejectedEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  const userName = request.cookies.get("user_name")?.value ?? "Admin";
  if (!userId || !["admin", "sub_admin_users"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { action, reason } = await request.json();
  if (!["approve", "reject"].includes(action))
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });

  const before = await getUserById(id);
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "approve") {
    const user = await approveSignup(id, userId);
    await sendSignupApprovedEmail({ email: user.email, name: user.name, role: user.role });
    await logAdminAction({ actorId: userId, actorName: userName, action: "signup_approved", targetType: "user", targetId: id });
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  const user = await rejectSignup(id, userId, reason ?? "");
  await sendSignupRejectedEmail({ email: user.email, name: user.name }, reason);
  await logAdminAction({ actorId: userId, actorName: userName, action: "signup_rejected", targetType: "user", targetId: id, details: { reason } });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
