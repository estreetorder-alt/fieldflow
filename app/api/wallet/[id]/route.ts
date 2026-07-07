import { NextRequest, NextResponse } from "next/server";
import { confirmTopup, getUserById } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action } = await request.json();

  if (action === "confirm") {
    // Get transaction details before confirming
    const { data } = await supabase.from("wallet_transactions").select("*").eq("id", id).single();
    const row = data as Record<string,unknown>;
    if (!row) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    await confirmTopup(id);

    // Email user that wallet was topped up
    const user = await getUserById(row.user_id as string);
    if (user?.email) {
      await sendPaymentConfirmationEmail(
        { email: user.email, name: user.name },
        Number(row.amount),
        `Wallet Top-up — $${row.amount} added to your Snapect wallet`
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    await supabase.from("wallet_transactions").update({ status: "cancelled" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
