import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;

  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = store.users.find((u) => u.id === userId);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
  });
}
