import { NextRequest, NextResponse } from "next/server";
import { activateUserAccount, suspendUserAccount, unsuspendUserAccount, getUserById } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action } = await request.json();

  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "activate") {
    await activateUserAccount(id);
    const fee = user.role === "agent" ? 15 : 30;
    if (user.email) {
      await sendPaymentConfirmationEmail(
        { email: user.email, name: user.name },
        fee,
        `${user.role === "agent" ? "Agent" : "Client"} Account Activation`
      );
    }
    return NextResponse.json({ ok: true, message: `${user.name} activated` });
  }

  if (action === "suspend") {
    await suspendUserAccount(id);
    return NextResponse.json({ ok: true, message: `${user.name} suspended` });
  }

  if (action === "unsuspend") {
    await unsuspendUserAccount(id);
    return NextResponse.json({ ok: true, message: `${user.name} unsuspended` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
