import { NextRequest, NextResponse } from "next/server";
import { startChat } from "@/lib/supportChat";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chat, messages } = await startChat(userId);
  return NextResponse.json({ chat, messages }, { status: 201 });
}
