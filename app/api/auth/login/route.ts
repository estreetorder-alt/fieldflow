import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const user = await getUserByEmail(email);

  if (!user || user.password !== password)
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  // Admin always can log in
  if (user.role !== "admin") {
    if (user.suspended)
      return NextResponse.json({ error: "Your account has been suspended. Contact support@snapect.com" }, { status: 403 });
    if (!user.accountActive)
      return NextResponse.json({
        error: "pending_activation",
        message: "Your account is pending activation. Please complete your payment to access your dashboard.",
      }, { status: 403 });
  }

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  });
  response.cookies.set("user_id",   user.id,   { httpOnly: true,  path: "/", sameSite: "lax" });
  response.cookies.set("user_role", user.role,  { httpOnly: true,  path: "/", sameSite: "lax" });
  response.cookies.set("user_name", user.name,  { httpOnly: false, path: "/", sameSite: "lax" });
  return response;
}
