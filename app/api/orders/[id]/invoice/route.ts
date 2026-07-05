import { NextRequest, NextResponse } from "next/server";
import { getOrderById, getUserById } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const TIER_LABELS: Record<string,string> = {
  standard: "Next Business Day",
  rush_24hr: "24-Hour Rush",
  rush_6hr: "6-Hour Rush",
};

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (userRole === "client" && order.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [client, agent] = await Promise.all([
    getUserById(order.clientId),
    order.assignedAgentId ? getUserById(order.assignedAgentId) : Promise.resolve(null),
  ]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${order.id} — Snapect</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;padding:40px}
.page{max-width:800px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:#0f1f3d;color:white;padding:36px 40px;display:flex;justify-content:space-between;align-items:flex-start}
.brand{font-size:26px;font-weight:800;letter-spacing:-.5px;color:#f0b429}
.brand span{opacity:.7;font-size:13px;display:block;font-weight:400;margin-top:4px;color:white}
.inv-num{text-align:right}.inv-num h2{font-size:20px;font-weight:700}
.inv-num p{opacity:.75;font-size:13px;margin-top:4px}
.body{padding:40px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
.party h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px}
.party p{color:#1e293b;font-size:14px;line-height:1.6}
.party .name{font-weight:700;font-size:15px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{text-align:left;padding:10px 14px;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b}
td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:14px}
.total-row{font-weight:700;font-size:15px;background:#fef9c3}
.total-row td{border-bottom:none}
.paid{background:#dcfce7;color:#16a34a;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700}
.unpaid{background:#fef3c7;color:#d97706;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700}
.footer{padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.footer p{font-size:12px;color:#94a3b8}
.divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
@media print{body{padding:0;background:white}.page{box-shadow:none}}
</style></head>
<body><div class="page">
  <div class="header">
    <div class="brand">SNAPECT<span>Field Inspection Services</span></div>
    <div class="inv-num"><h2>INVOICE</h2><p>#${order.id.toUpperCase()}</p><p>Issued: ${fmt(order.createdAt)}</p></div>
  </div>
  <div class="body">
    <div class="parties">
      <div class="party">
        <h3>Bill To</h3>
        <p class="name">${client?.name ?? "—"}</p>
        <p>${client?.email ?? ""}</p>
        ${client?.phone ? `<p>${client.phone}</p>` : ""}
        ${(client as unknown as Record<string,unknown>)?.company ? `<p>${(client as unknown as Record<string,unknown>).company}</p>` : ""}
      </div>
      <div class="party">
        <h3>Service Provider</h3>
        <p class="name">Snapect</p>
        <p>support@snapect.com</p>
        <p>${BASE}</p>
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Service</th><th>Turnaround</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>${order.address}</td>
          <td style="text-transform:capitalize">${order.serviceType.replace(/_/g," ")}</td>
          <td>${TIER_LABELS[order.turnaroundTier] ?? order.turnaroundTier}</td>
          <td>${fmt(order.createdAt)}</td>
          <td style="text-align:right;font-weight:600">$${order.totalPrice.toFixed(2)}</td>
        </tr>
        ${order.customizeNotes ? `<tr><td colspan="4" style="color:#64748b;font-style:italic;font-size:13px">Note: ${order.customizeNotes}</td><td></td></tr>` : ""}
      </tbody>
      <tfoot>
        <tr class="total-row"><td colspan="4" style="text-align:right">Total</td><td style="text-align:right">$${order.totalPrice.toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <span style="font-size:14px;color:#64748b">Payment Status</span>
      <span class="${order.invoicePaid ? "paid" : "unpaid"}">${order.invoicePaid ? "✓ PAID" : "PENDING PAYMENT"}</span>
    </div>
    ${agent ? `
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px">
      <p style="font-size:12px;color:#64748b;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Assigned Agent</p>
      <p style="font-size:14px;color:#1e293b;font-weight:600">${agent.name}</p>
    </div>` : ""}
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px">
      <p style="font-size:12px;color:#64748b;line-height:1.7">
        This invoice is generated by Snapect Field Inspection Services.
        ${order.photoExpiresAt ? `Photos for this order expire on <strong>${fmt(order.photoExpiresAt)}</strong>. Download before this date.` : ""}
        Questions? Email <strong>support@snapect.com</strong>
      </p>
    </div>
  </div>
  <div class="footer">
    <p>Snapect · snapect.com · support@snapect.com</p>
    <p>Generated ${fmt(new Date().toISOString())}</p>
  </div>
</div></body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="invoice-${order.id}.html"`,
    },
  });
}
