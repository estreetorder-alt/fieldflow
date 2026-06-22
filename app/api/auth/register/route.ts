import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, name, phone, role, company, bio, coverageZone, vehicle } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["client", "agent"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = store.users.find((u) => u.email === email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const user = {
    id: `user-${Date.now()}`,
    email,
    password,
    role: role as "client" | "agent",
    name,
    phone: phone ?? "",
    company: company ?? "",
    createdAt: new Date().toISOString(),
    ...(role === "agent" && {
      available: true,
      rating: 4.0,
      bio: bio ?? "",
      coverageZone: coverageZone ?? "",
      vehicle: vehicle ?? "",
      totalEarnings: 0,
      pendingPayout: 0,
      completedJobs: 0,
    }),
  };

  store.users.push(user);

  store.emailLog.push({
    timestamp: new Date().toISOString(),
    type: "welcome",
    to: email,
    subject: `Welcome to FieldFlow${role === "agent" ? " — Your application is under review" : ""}`,
    body: role === "agent"
      ? "Thank you for registering as a field agent. Your application is under review and you'll be notified within 1–2 business days."
      : "Welcome to FieldFlow! You can now submit inspection orders.",
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  }, { status: 201 });

  response.cookies.set("user_id", user.id, { httpOnly: true, path: "/", sameSite: "lax" });
  response.cookies.set("user_role", user.role, { httpOnly: true, path: "/", sameSite: "lax" });
  response.cookies.set("user_name", user.name, { httpOnly: false, path: "/", sameSite: "lax" });

  return response;
}
