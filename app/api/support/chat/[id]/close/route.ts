import { NextRequest, NextResponse } from "next/server";
import { getChat, closeChat } from "@/lib/supportChat";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await getChat(id, userId);
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  // Persistent close — this chat now stays in the user's Support Center
  // history instead of being deleted.
  await closeChat(id);
  return NextResponse.json({ ok: true });
}
