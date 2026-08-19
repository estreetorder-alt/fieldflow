import { NextRequest, NextResponse } from "next/server";
import { addPhoto, uploadPhotoToStorage, getOrderById, addStatusHistory, anonUserId, getUserById } from "@/lib/db";
import { canAccessScope } from "@/lib/adminAccess";
import { sendPhotosReleasedEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !(userRole === "agent" || userRole === "admin" || canAccessScope(userRole, "orders")))
    return NextResponse.json({ error: "Agents or admin only" }, { status: 403 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (userRole === "agent" && order.assignedAgentId !== userId)
    return NextResponse.json({ error: "You are not assigned to this order" }, { status: 403 });

  const body = await request.json();

  // Admin: batch upload on behalf of the assigned agent — the vendor sees it as
  // the anonymized agent ("Agent #A93F2C"), never as admin.
  if (userRole === "admin" || canAccessScope(userRole, "orders")) {
    if (!order.assignedAgentId)
      return NextResponse.json({ error: "This order has no assigned agent — assign one before uploading on their behalf" }, { status: 400 });

    const items: { filename: string; url: string; description?: string }[] =
      Array.isArray(body.photos) ? body.photos
      : body.filename && body.url ? [{ filename: body.filename, url: body.url, description: body.description }]
      : [];
    if (items.length === 0) return NextResponse.json({ error: "photos array or filename+url required" }, { status: 400 });

    const release = body.release !== false; // default: released straight to the vendor
    const photos = [];
    for (const item of items) {
      let photoUrl = item.url;
      if (item.url.startsWith("data:")) {
        try { photoUrl = await uploadPhotoToStorage(id, item.filename, item.url); } catch { photoUrl = item.url; }
      }
      photos.push(await addPhoto({
        orderId: id, filename: item.filename, url: photoUrl,
        description: item.description ?? "", approved: release,
      }));
    }
    // Timeline entry attributed to the anonymized agent, not admin
    await addStatusHistory(id, order.status,
      `${anonUserId(order.assignedAgentId, order.id)} uploaded ${photos.length} photo${photos.length !== 1 ? "s" : ""}`);
    return NextResponse.json({ photos }, { status: 201 });
  }

  const { filename, url, description } = body;
  if (!filename || !url) return NextResponse.json({ error: "filename and url required" }, { status: 400 });

  // Try to upload to Supabase Storage (falls back to base64 if not configured)
  let photoUrl = url;
  if (url.startsWith("data:")) {
    try {
      photoUrl = await uploadPhotoToStorage(id, filename, url);
    } catch {
      photoUrl = url; // keep base64 as fallback
    }
  }

  // Agent uploads are held for admin review — vendor only sees them once released
  const photo = await addPhoto({ orderId: id, filename, url: photoUrl, description: description ?? "", approved: false });
  return NextResponse.json({ photo }, { status: 201 });
}

// Admin: release photos to the vendor (approve one or all on an order)
export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !(userRole === "admin" || canAccessScope(userRole, "orders")))
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { supabase } = await import("@/lib/supabase");

  // Notify the client whenever photos are actually released to them — this
  // was previously silent. Worded as the agent's upload (matching what the
  // vendor already sees in Status History), not as an admin action, since
  // admin review is invisible to the vendor by design.
  async function notifyClientOfRelease(photoCount: number) {
    if (photoCount <= 0) return;
    const order = await getOrderById(id);
    if (!order) return;
    const client = order.client ?? (order.clientId ? await getUserById(order.clientId) : null);
    if (!client?.email) return;
    await sendPhotosReleasedEmail({
      clientEmail: client.email,
      clientName: client.name ?? "there",
      address: order.address,
      orderId: id,
      photoCount,
      agentLabel: order.assignedAgentId ? anonUserId(order.assignedAgentId, order.id) : "Your field agent",
      baseUrl: BASE_URL,
    });
  }

  if (body.approveAll === true) {
    const { data: newlyApproved } = await supabase
      .from("photos").select("id").eq("order_id", id).eq("approved", false);
    await supabase.from("photos").update({ approved: true }).eq("order_id", id);
    await notifyClientOfRelease(newlyApproved?.length ?? 0);
    return NextResponse.json({ ok: true });
  }
  if (body.photoId) {
    const approving = body.approved !== false;
    await supabase.from("photos").update({ approved: approving }).eq("id", body.photoId).eq("order_id", id);
    if (approving) await notifyClientOfRelease(1);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "photoId or approveAll required" }, { status: 400 });
}

// Admin: delete a photo
export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !(userRole === "admin" || canAccessScope(userRole, "orders")))
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const { photoId } = await request.json();
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("photos").delete().eq("id", photoId).eq("order_id", id);
  return NextResponse.json({ ok: true });
}
