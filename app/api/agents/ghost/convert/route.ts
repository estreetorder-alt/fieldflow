import { NextRequest, NextResponse } from "next/server";
import { convertGhostToRealAgent, getUserByEmail } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

// Req. 4 — the local contact behind a ghost agent can be converted into a
// proper self-registered agent later. Admin issues them a temp password
// (req. 7) which forces a change on first login; the ghost row is frozen
// (suspended) but keeps its full job/bid history intact for records.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["admin", "sub_admin_users"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { ghostId, email, tempPassword } = await request.json();
  if (!ghostId || !email?.trim()) return NextResponse.json({ error: "ghostId and email are required" }, { status: 400 });

  const exists = await getUserByEmail(email);
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const { hashPassword } = await import("@/lib/password");
  const generatedPassword = tempPassword?.trim() || Math.random().toString(36).slice(2, 10) + "A1!";

  const real = await convertGhostToRealAgent(ghostId, {
    email: email.trim().toLowerCase(),
    password: await hashPassword(generatedPassword),
    createdBy: userId,
  });

  await sendWelcomeEmail({ email: real.email, name: real.name, role: "agent" });

  return NextResponse.json({
    agent: { id: real.id, name: real.name, email: real.email },
    tempPassword: generatedPassword,
  }, { status: 201 });
}
