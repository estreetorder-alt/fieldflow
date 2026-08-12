import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUser } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";

// Req. 7 — every admin-created account gets a temporary password and must
// change it on first login. This is a session-authenticated change (the
// user is already logged in with the temp password) as opposed to the
// token-based /api/auth/reset-password flow used for "forgot password".
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  if (newPassword.length < 8)
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!(await verifyPassword(currentPassword, user.password)))
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  await updateUser(userId, { password: await hashPassword(newPassword), mustChangePassword: false });
  return NextResponse.json({ ok: true });
}
