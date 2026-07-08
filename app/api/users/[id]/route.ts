import { NextRequest, NextResponse } from "next/server";
import { activateUserAccount, suspendUserAccount, unsuspendUserAccount, getUserById, logAdminAction } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action } = await request.json();

  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const admin = await getUserById(adminId);

  if (action === "activate") {
    await activateUserAccount(id);
    await logAdminAction({ actorId: adminId, actorName: admin?.name ?? "Admin", action: "user.activate", targetType: "user", targetId: id, details: { role: user.role, email: user.email } });
    if (user.email) {
      if (user.role === "agent") {
        // Agents don't pay a fee — send a plain activation confirmation, no dollar amount
        await sendPaymentConfirmationEmail({ email: user.email, name: user.name }, 0, "Agent Account Activation (Free)");
      } else {
        await sendPaymentConfirmationEmail({ email: user.email, name: user.name }, 30, "Client Account Activation");
      }
    }
    return NextResponse.json({ ok: true, message: `${user.name} activated` });
  }

  if (action === "suspend") {
    await suspendUserAccount(id);
    await logAdminAction({ actorId: adminId, actorName: admin?.name ?? "Admin", action: "user.suspend", targetType: "user", targetId: id, details: { role: user.role, email: user.email } });
    return NextResponse.json({ ok: true, message: `${user.name} suspended` });
  }

  if (action === "unsuspend") {
    await unsuspendUserAccount(id);
    await logAdminAction({ actorId: adminId, actorName: admin?.name ?? "Admin", action: "user.unsuspend", targetType: "user", targetId: id, details: { role: user.role, email: user.email } });
    return NextResponse.json({ ok: true, message: `${user.name} unsuspended` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
