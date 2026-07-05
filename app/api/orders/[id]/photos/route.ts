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

  const photo = await addPhoto({ orderId: id, filename, url: photoUrl, description: description ?? "" });
  return NextResponse.json({ photo }, { status: 201 });
}
