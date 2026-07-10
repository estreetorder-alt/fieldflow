import { NextRequest, NextResponse } from "next/server";
import { SERVICE_CATALOG } from "@/lib/services";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin sees full catalog with pricing; clients and agents get a price-free list
  if (userRole === "admin") {
    return NextResponse.json({ catalog: SERVICE_CATALOG });
  }

  const catalog = SERVICE_CATALOG.map(cat => ({
    id: cat.id,
    label: cat.label,
    services: cat.services.map(({ basePrice, compensation, ...rest }) => {
      void basePrice; void compensation;
      return rest;
    }),
  }));
  return NextResponse.json({ catalog });
}
