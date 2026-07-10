import { NextRequest, NextResponse } from "next/server";
import {
  createPhotoSubmission, getPhotoSubmissions, getPhotoSubmissionById,
  updatePhotoSubmissionStatus, addPhoto, uploadPhotoToStorage, getOrderById, getUserById,
} from "@/lib/db";
import { sendNtfyNotification } from "@/lib/notify";

// GET — admin sees all submissions; agents see their own
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "admin") {
    const submissions = await getPhotoSubmissions();
    return NextResponse.json({ submissions });
  }
  if (userRole === "agent") {
    const submissions = await getPhotoSubmissions(userId);
    return NextResponse.json({ submissions });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — agent submits the open photo form (goes straight to the admin inbox)
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "agent")
    return NextResponse.json({ error: "Agents only" }, { status: 403 });

  const body = await request.json();
  const { serviceName, orderId, photos } = body as {
    serviceName?: string; orderId?: string | null;
    photos?: { label: string; filename: string; url: string }[];
  };
  if (!photos?.length) return NextResponse.json({ error: "At least one photo required" }, { status: 400 });
  if (photos.length > 200) return NextResponse.json({ error: "Maximum 200 photos per submission" }, { status: 400 });

  // If linked to an order, the agent must be assigned to it
  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order || order.assignedAgentId !== userId)
      return NextResponse.json({ error: "You are not assigned to that order" }, { status: 403 });
  }

  // Upload each photo to storage (base64 fallback if bucket missing)
  const stored: { label: string; filename: string; url: string }[] = [];
  for (const ph of photos) {
    let url = ph.url;
    if (url?.startsWith("data:")) {
      try { url = await uploadPhotoToStorage(orderId ?? "submissions", ph.filename, url); } catch { /* keep base64 */ }
    }
    stored.push({ label: ph.label ?? "", filename: ph.filename ?? "photo.jpg", url });
  }

  const submission = await createPhotoSubmission({
    agentId: userId, orderId: orderId ?? null,
    serviceName: serviceName ?? "", photos: stored,
  });

  const agent = await getUserById(userId);
  await sendNtfyNotification({
    title: `📸 Photo submission — ${stored.length} photos`,
    message: `Agent: ${agent?.name}\nService: ${serviceName || "—"}\n${orderId ? `Order: ${orderId}` : "No order linked"}\nReview in Admin → Photo Inbox.`,
    priority: "default", tags: ["camera"],
  }).catch(() => {});

  return NextResponse.json({ submission }, { status: 201 });
}

// PATCH — admin reviews: send to a vendor's order, or dismiss
export async function PATCH(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id, action, orderId } = await request.json();
  if (!id || !["send", "dismiss"].includes(action))
    return NextResponse.json({ error: "id and action (send|dismiss) required" }, { status: 400 });

  const sub = await getPhotoSubmissionById(id);
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  if (action === "dismiss") {
    await updatePhotoSubmissionStatus(id, "dismissed");
    return NextResponse.json({ ok: true });
  }

  // send → copy photos onto the target order as approved (visible to the vendor)
  const targetOrderId = orderId ?? sub.orderId;
  if (!targetOrderId) return NextResponse.json({ error: "Choose an order to send these photos to" }, { status: 400 });
  const order = await getOrderById(targetOrderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  for (const ph of sub.photos) {
    await addPhoto({
      orderId: targetOrderId, filename: ph.filename,
      url: ph.url, description: ph.label, approved: true,
    });
  }
  await updatePhotoSubmissionStatus(id, "sent");
  return NextResponse.json({ ok: true, sentTo: targetOrderId });
}
