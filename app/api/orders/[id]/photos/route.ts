import { NextRequest, NextResponse } from "next/server";
import { addPhoto, uploadPhotoToStorage, getOrderById } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "agent") return NextResponse.json({ error: "Agents only" }, { status: 403 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.assignedAgentId !== userId)
    return NextResponse.json({ error: "You are not assigned to this order" }, { status: 403 });

  const { filename, url, description } = await request.json();
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
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { supabase } = await import("@/lib/supabase");

  if (body.approveAll === true) {
    await supabase.from("photos").update({ approved: true }).eq("order_id", id);
    return NextResponse.json({ ok: true });
  }
  if (body.photoId) {
    await supabase.from("photos").update({ approved: body.approved !== false }).eq("id", body.photoId).eq("order_id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "photoId or approveAll required" }, { status: 400 });
}

// Admin: delete a photo
export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const { photoId } = await request.json();
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });
  const { supabase } = await import("@/lib/supabase");
  await supabase.from("photos").delete().eq("id", photoId).eq("order_id", id);
  return NextResponse.json({ ok: true });
}
