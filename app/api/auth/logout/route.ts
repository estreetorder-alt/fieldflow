import { NextResponse } from "next/server";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("user_id",   "", { maxAge: 0, path: "/" });
  response.cookies.set("user_role", "", { maxAge: 0, path: "/" });
  response.cookies.set("user_name", "", { maxAge: 0, path: "/" });
  return response;
}
