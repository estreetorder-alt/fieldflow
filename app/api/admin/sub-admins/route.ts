import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser, getAllUsers } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";

const SUB_ADMIN_ROLES = ["admin", "sub_admin_orders", "sub_admin_users", "sub_admin_finance", "sub_admin_support"];

function generateTempPassword(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";
}

// Req. 6/7 — only the full-access top-level admin can mint new admin-tier
// accounts (a sub-admin cannot create peers or escalate itself). Every
// account is admin-created here with a temp password that forces a change
// on first login (mustChangePassword).
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Only the top-level admin can create admin accounts" }, { status: 403 });

  const { name, email, role } = await request.json();
  if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  if (!SUB_ADMIN_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const exists = await getUserByEmail(email);
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const account = await createUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    email: email.trim().toLowerCase(),
    password: await hashPassword(tempPassword),
    role,
    name: name.trim(),
    phone: "",
    mustChangePassword: true,
    createdBy: userId,
    signupStatus: "approved", // admin-created, no self-service approval gate
  });

  const { activateUserAccount } = await import("@/lib/db");
  await activateUserAccount(account.id);
  await sendWelcomeEmail({ email: account.email, name: account.name, role: account.role });

  return NextResponse.json({
    account: { id: account.id, name: account.name, email: account.email, role: account.role },
    tempPassword,
  }, { status: 201 });
}

// List all admin-tier accounts (top admin + the four sub-admin roles).
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const all = await getAllUsers();
  const admins = all.filter(u => SUB_ADMIN_ROLES.includes(u.role));
  return NextResponse.json({
    accounts: admins.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      mustChangePassword: u.mustChangePassword ?? false,
      suspended: u.suspended ?? false, createdAt: u.createdAt,
    })),
  });
}
