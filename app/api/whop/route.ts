import { NextRequest, NextResponse } from "next/server";
import { getWhopClient, getWhopCompanyId } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client")
    return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const client = getWhopClient();
  const companyId = getWhopCompanyId();
  if (!client || !companyId) {
    return NextResponse.json({ skip: true, message: "Whop not configured — order placed without payment" });
  }

  const { orderData, totalPrice, description, successUrl } = await request.json();

  const checkout = await client.checkoutConfigurations.create({
    plan: {
      company_id: companyId,
      currency: "usd",
      initial_price: totalPrice,
      plan_type: "one_time",
      title: description ?? "Snapect Inspection Order",
    },
    redirect_url: successUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/client?payment=success`,
    metadata: {
      userId,
      orderData: JSON.stringify(orderData),
    },
  });

  return NextResponse.json({ url: checkout.purchase_url, sessionId: checkout.id });
}
