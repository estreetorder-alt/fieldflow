import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || userRole !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idx = store.orders.findIndex((o) => o.id === id);

  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (store.orders[idx].assignedAgentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename, url, description } = await request.json();

  if (!filename || !url) {
    return NextResponse.json({ error: "filename and url are required" }, { status: 400 });
  }

  const photo = {
    id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    filename,
    url,
    description: description ?? "",
    uploadedAt: new Date().toISOString(),
    selectedByClient: false,
  };

  store.orders[idx].photos.push(photo);
  store.orders[idx].statusHistory.push({
    status: store.orders[idx].status,
    timestamp: new Date().toISOString(),
    note: `Photo uploaded: ${filename}`,
  });

  return NextResponse.json({ photo, totalPhotos: store.orders[idx].photos.length });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || userRole !== "agent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (store.orders[idx].assignedAgentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { photoId } = await request.json();
  store.orders[idx].photos = store.orders[idx].photos.filter((p) => p.id !== photoId);

  return NextResponse.json({ ok: true, totalPhotos: store.orders[idx].photos.length });
}
