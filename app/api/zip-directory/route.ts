import { NextRequest, NextResponse } from "next/server";
import { lookupZip } from "@/lib/zipState";

// Public — used for address/coverage-zone autofill on registration and order forms.
// GET /api/zip-directory?zip=60601
export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip") ?? "";
  const info = lookupZip(zip);
  if (!info) return NextResponse.json({ error: "ZIP not found" }, { status: 404 });
  return NextResponse.json({ zip: info });
}
