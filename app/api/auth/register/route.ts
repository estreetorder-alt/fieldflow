import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createUser } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  const body = await request.json();
  const { email, password, name, phone, role, company, adminCreate, bio, coverageZone, vehicle, zip } = body;

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
    password: await hashPassword(password),
    role: adminCreate ? role : (body.role ?? "client"),
    name, phone: phone ?? "",
    company: company ?? undefined,
    ...(adminCreate && role === "agent" || body.role === "agent" ? {
      available: false, // pending approval
      rating: 5.0, bio: bio ?? "",
      coverageZone: coverageZone ?? zip ?? "",
      vehicle: vehicle ?? "",
      totalEarnings: 0, pendingPayout: 0, completedJobs: 0,
      approved: false, // must submit sample
    } : {}),
  });

  // Send welcome email
  await sendWelcomeEmail({ email: newUser.email, name: newUser.name, role: newUser.role });

  if (adminCreate) {
    // Admin-created users are immediately active
    const { activateUserAccount } = await import("@/lib/db");
    await activateUserAccount(newUser.id);
    return NextResponse.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } }, { status: 201 });
  }

  if (newUser.role === "agent") {
    // Agent signup is free — no application fee, no manual activation step.
    const { activateUserAccount } = await import("@/lib/db");
    await activateUserAccount(newUser.id);
    return NextResponse.json({
      user: { id: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email },
      requiresPayment: false,
    }, { status: 201 });
  }

  // Client signup is free — activate immediately, no activation fee
  {
    const { activateUserAccount } = await import("@/lib/db");
    await activateUserAccount(newUser.id);
  }
  return NextResponse.json({
    user: { id: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email },
    requiresPayment: false,
  }, { status: 201 });
}
