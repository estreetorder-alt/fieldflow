import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/db";
import { addEmailLog } from "@/lib/db";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  const body = await request.json();
  const { email, password, name, phone, role, company, adminCreate } = body;

  if (!email || !password || !name)
    return NextResponse.json({ error: "email, password, and name are required" }, { status: 400 });

  if (adminCreate) {
    if (!userId || userRole !== "admin")
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    if (!["agent", "client"].includes(role))
      return NextResponse.json({ error: "Role must be agent or client" }, { status: 400 });
  }

  const exists = await getUserByEmail(email);
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const newUser = await createUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    email: email.toLowerCase(),
    password,
    role: adminCreate ? role : "client",
    name, phone: phone ?? "", company: company ?? undefined,
    ...(adminCreate && role === "agent" ? {
      available: true, rating: 5.0, bio: "", coverageZone: "", vehicle: "",
      totalEarnings: 0, pendingPayout: 0, completedJobs: 0,
    } : {}),
  });

  await addEmailLog({
    type: "welcome", to: email,
    subject: `Welcome to FieldFlow, ${name}!`,
    body: adminCreate
      ? `Account created by admin. Email: ${email} / Password: ${password}`
      : "Thanks for signing up.",
  });

  if (adminCreate)
    return NextResponse.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }, { status: 201 });

  const response = NextResponse.json({
    user: { id: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email },
  }, { status: 201 });
  response.cookies.set("user_id",   newUser.id,   { httpOnly: true,  path: "/", sameSite: "lax" });
  response.cookies.set("user_role", newUser.role,  { httpOnly: true,  path: "/", sameSite: "lax" });
  response.cookies.set("user_name", newUser.name,  { httpOnly: false, path: "/", sameSite: "lax" });
  return response;
}
