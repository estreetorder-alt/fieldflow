import { NextRequest, NextResponse } from "next/server";
import { sendAdminNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, email, subject, message } = body;
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    await sendAdminNotification({
      title: `📩 Contact form: ${subject.trim()}`,
      message: `From: ${name.trim()} (${email.trim()})\n\n${message.trim()}`,
      type: "contact_form",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] failed to send admin notification", err);
    return NextResponse.json({ error: "Failed to send message — please try again" }, { status: 500 });
  }
}
