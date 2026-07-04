import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const order = store.orders.find((o) => o.id === id);
  if (!order) return new NextResponse("Not found", { status: 404 });

  if (userRole === "client" && order.clientId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const client = store.users.find((u) => u.id === order.clientId);
  const agent = order.assignedAgentId
    ? store.users.find((u) => u.id === order.assignedAgentId)
    : null;

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const statusColor: Record<string, string> = {
    pending: "#b45309",
    in_progress: "#1d4ed8",
    completed: "#15803d",
    cancelled: "#b91c1c",
  };

  const photoRows = order.photos.length > 0
    ? order.photos.map((p, i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${p}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">Uploaded</td>
        </tr>`).join("")
    : `<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">No photos uploaded yet</td></tr>`;

  const historyRows = order.statusHistory.map((ev) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${new Date(ev.timestamp).toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
        <span style="background:${statusColor[ev.status] ?? "#64748b"}20;color:${statusColor[ev.status] ?? "#64748b"};padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;">${statusLabel[ev.status] ?? ev.status}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#475569;">${ev.note}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Snapect Inspection Report — ${order.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
  .brand-icon { width: 36px; height: 36px; background: #1d4ed8; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 18px; }
  .brand-name { font-size: 20px; font-weight: 800; color: #1e293b; }
  .report-title { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
  .report-title p { color: #64748b; font-size: 14px; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
  .card-value { font-size: 15px; font-weight: 600; color: #1e293b; }
  .card-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 13px; font-weight: 700; }
  .section { margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="brand">
    <div class="brand-icon">F</div>
    <span class="brand-name">Snapect</span>
  </div>

  <div class="report-title">
    <h1>Inspection Report</h1>
    <p>Order #${order.id} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Property Address</div>
      <div class="card-value">${order.address}</div>
    </div>
    <div class="card">
      <div class="card-label">Current Status</div>
      <div class="card-value">
        <span class="status-badge" style="background:${statusColor[order.status]}20;color:${statusColor[order.status]};">${statusLabel[order.status]}</span>
      </div>
    </div>
    <div class="card">
      <div class="card-label">Service Type</div>
      <div class="card-value" style="text-transform:capitalize;">${order.serviceType}</div>
      <div class="card-sub">${order.turnaroundTier === "rush_6hr" ? "⚡ 6-Hour Rush" : order.turnaroundTier === "rush_24hr" ? "⚡ 24-Hour Rush" : "Standard delivery"}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Price</div>
      <div class="card-value">$${order.totalPrice}</div>
    </div>
    <div class="card">
      <div class="card-label">Client</div>
      <div class="card-value">${client?.name ?? "—"}</div>
      <div class="card-sub">${client?.email ?? ""}</div>
    </div>
    <div class="card">
      <div class="card-label">Field Agent</div>
      <div class="card-value">${agent?.name ?? "Not yet assigned"}</div>
      <div class="card-sub">${agent?.email ?? ""}</div>
    </div>
  </div>

  ${order.notes ? `
  <div class="section">
    <h2>Special Instructions</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;">${order.notes}</p>
  </div>` : ""}

  <div class="section">
    <h2>Status History</h2>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Status</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>${historyRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Photos (${order.photos.length})</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Filename / Description</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${photoRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <span>Snapect &copy; 2025 · fieldflow.com</span>
    <span>Order ${order.id} · ${new Date(order.createdAt).toLocaleDateString()}</span>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="fieldflow-report-${id}.html"`,
    },
  });
}
