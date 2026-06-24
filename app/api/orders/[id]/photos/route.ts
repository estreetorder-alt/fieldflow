import { NextRequest, NextResponse } from "next/server";
import { addPhoto } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { filename, url, description } = await request.json();
  const photo = await addPhoto({ orderId: id, filename, url: url ?? "", description: description ?? "" });
  return NextResponse.json({ photo }, { status: 201 });
}
