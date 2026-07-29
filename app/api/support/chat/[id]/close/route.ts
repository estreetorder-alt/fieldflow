import { NextRequest, NextResponse } from "next/server";
import { getChat, wipeChat } from "@/lib/supportChat";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await getChat(id, userId);
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  // App-side wipe only, per your call — the Slack thread (if any) stays put
  // as the permanent record.
  await wipeChat(id);
  return NextResponse.json({ ok: true });
}
