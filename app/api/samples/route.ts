import { NextRequest, NextResponse } from "next/server";
import { submitSample, getPendingSamples } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const samples = await getPendingSamples();
  return NextResponse.json({ samples });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "agent") return NextResponse.json({ error: "Agents only" }, { status: 403 });
  const { photos } = await request.json();
  if (!photos?.length) return NextResponse.json({ error: "At least one photo required" }, { status: 400 });
  const sample = await submitSample(userId, photos);

  // Notify admin
  const { sendAdminNotification } = await import("@/lib/email");
  await sendAdminNotification({
    title: "📸 New Sample Submission",
    message: `Agent ID: ${userId}\nPhotos: ${photos.length}\nAction required: Review in admin panel.`,
    type: "sample_submitted",
  });

  return NextResponse.json({ sample }, { status: 201 });
}
