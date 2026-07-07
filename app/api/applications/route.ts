import { NextRequest, NextResponse } from "next/server";
import { saveAgentApplication, getAgentApplications } from "@/lib/db";
import { sendAdminNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const apps = await getAgentApplications();
  return NextResponse.json({ applications: apps });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, phone, zip, city, state, experience, why } = body;
  if (!name || !email || !phone || !zip || !city || !state)
    return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });

  await saveAgentApplication({ name, email, phone, zip, city, state, experience: experience ?? "", why: why ?? "" });

  await sendAdminNotification({
    title: `🙋 New Agent Application — ${name}`,
    message: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nZIP: ${zip}\nCity: ${city}, ${state}\nExperience: ${experience}\n\nReview in Admin panel.`,
    type: "agent_application",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
