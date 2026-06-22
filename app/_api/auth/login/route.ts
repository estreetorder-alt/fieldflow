import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const user = store.users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  });

  response.cookies.set("user_id", user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("user_role", user.role, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("user_name", user.name, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
