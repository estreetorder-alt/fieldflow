import { addEmailLog } from "./db";
import { sendNtfyNotification } from "./notify";

const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = "Snapect <noreply@snapect.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@snapect.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com";

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY) return; // stub mode — logged only
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
  } catch { /* fail silently */ }
}

function emailWrapper(title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:#0f1f3d;padding:28px 32px;text-align:center;">
    <img src="${BASE_URL}/snapect-logo.png" alt="Snapect" height="48" style="height:48px;width:auto;filter:brightness(0)invert(1);"/>
  </td></tr>
  <tr><td style="padding:36px 32px;">
    <h2 style="margin:0 0 16px;color:#0f1f3d;font-size:22px;font-weight:700;">${title}</h2>
    ${body}
    ${ctaUrl ? `<div style="text-align:center;margin:28px 0;">
      <a href="${ctaUrl}" style="background:#c8991a;color:#0f1f3d;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;display:inline-block;">${ctaText ?? "View Details"}</a>
    </div>` : ""}
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Snapect · <a href="${BASE_URL}/privacy" style="color:#c8991a;">Privacy Policy</a> · <a href="${BASE_URL}/terms" style="color:#c8991a;">Terms</a></p>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:11px;">support@snapect.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">${label}</td><td style="padding:6px 0;color:#0f1f3d;font-size:14px;font-weight:600;">${value}</td></tr>`;
}

// ── USER EMAILS ───────────────────────────────────────────────

export async function sendWelcomeEmail(user: { email: string; name: string; role: string }): Promise<void> {
  const isAgent = user.role === "agent";
  const subject = `Welcome to Snapect, ${user.name}!`;
  const html = emailWrapper(
    `Welcome to Snapect, ${user.name}!`,
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Your account has been created successfully.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Account Type", isAgent ? "Field Agent" : "Client")}
       ${row("Email", user.email)}
       ${row("Status", "Pending activation")}
     </table>
     ${isAgent
       ? `<p style="color:#475569;font-size:14px;">⚠️ <strong>Action required:</strong> You must submit your 7-photo sample set within 48 hours of registration. Log in to your agent dashboard to upload your sample.</p>`
       : `<p style="color:#475569;font-size:14px;">Complete your payment to activate your account and start placing orders.</p>`}`,
    `${BASE_URL}/login`,
    "Log In to Your Account"
  );
  await addEmailLog({ type: "welcome", to: user.email, subject, body: `Welcome ${user.name} (${user.role})` });
  await sendViaResend(user.email, subject, html);

  // Notify admin of new signup
  await sendAdminNotification({
    title: `🆕 New ${isAgent ? "Agent" : "Client"} Signup`,
    message: `${user.name} (${user.email}) just registered as a ${user.role}.`,
    type: "user_signup",
  });
}

export async function sendPaymentConfirmationEmail(user: { email: string; name: string }, amount: number, type: string): Promise<void> {
  const isFree = amount <= 0;
  const subject = isFree ? "Account Activated" : "Payment Confirmed — Account Activated";
  const html = emailWrapper(
    isFree ? "Account Activated!" : "Payment Received & Account Activated!",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">${isFree
        ? `Thank you, ${user.name}. Your Snapect account is now active — no payment required.`
        : `Thank you, ${user.name}. Your payment of <strong>$${amount}</strong> has been received and your Snapect account is now active.`}</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${isFree ? row("Payment", "Free — $0") : row("Payment", `$${amount}`)}
       ${row("Type", type)}
       ${row("Status", "✅ Confirmed")}
     </table>
     <p style="color:#475569;font-size:14px;">You can now log in and access your dashboard.</p>`,
    `${BASE_URL}/login`,
    "Access Your Dashboard"
  );
  await addEmailLog({ type: "payment_confirmed", to: user.email, subject, body: isFree ? `Account activated (free) for ${user.name}` : `Payment $${amount} confirmed for ${user.name}` });
  await sendViaResend(user.email, subject, html);
}

// ── ORDER EMAILS ──────────────────────────────────────────────

export async function sendOrderConfirmedEmail(opts: {
  clientEmail: string; clientName: string; address: string;
  service: string; orderId: string; totalPrice: number;
}): Promise<void> {
  const subject = `Order Confirmed — ${opts.address}`;
  const html = emailWrapper(
    "Your Order Has Been Confirmed",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Your inspection order has been received and is being processed.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Order ID", opts.orderId)}
       ${row("Address", opts.address)}
       ${row("Service", opts.service)}
       ${row("Total", `$${opts.totalPrice}`)}
       ${row("Status", "⏳ Under Review")}
     </table>
     <p style="color:#475569;font-size:14px;">Once payment is verified, an agent will be assigned and you will receive another notification.</p>`,
    `${BASE_URL}/client`,
    "Track Your Order"
  );
  await addEmailLog({ type: "order_confirmed", to: opts.clientEmail, subject, body: `Order confirmed: ${opts.address}` });
  await sendViaResend(opts.clientEmail, subject, html);

  await sendAdminNotification({
    title: `📋 New Order — ${opts.service}`,
    message: `Client: ${opts.clientName}\nAddress: ${opts.address}\nAmount: $${opts.totalPrice}\nOrder: ${opts.orderId}`,
    type: "new_order",
  });
}

export async function sendOrderActivatedEmail(opts: {
  clientEmail: string; clientName: string; address: string; orderId: string;
}): Promise<void> {
  const subject = `Order Activated — ${opts.address}`;
  const html = emailWrapper(
    "Your Order is Now Active!",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Great news, ${opts.clientName}! Your payment has been confirmed and your order is now active. An agent has been assigned and will complete your inspection shortly.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Order ID", opts.orderId)}
       ${row("Address", opts.address)}
       ${row("Status", "✅ Active — Agent Assigned")}
     </table>`,
    `${BASE_URL}/client`,
    "Track Your Order"
  );
  await addEmailLog({ type: "order_activated", to: opts.clientEmail, subject, body: `Order activated: ${opts.address}` });
  await sendViaResend(opts.clientEmail, subject, html);
}

export async function sendOrderCompletionEmail(opts: {
  clientEmail: string; clientName: string; address: string;
  orderId: string; photoCount: number; baseUrl: string;
}): Promise<void> {
  const subject = `Your Photos Are Ready — ${opts.address}`;
  const html = emailWrapper(
    "Your Inspection Photos Are Ready!",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.clientName}, your inspection for <strong>${opts.address}</strong> has been completed.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Photos Uploaded", `${opts.photoCount} photo(s)`)}
       ${row("Storage", "Available for 30 days")}
       ${row("Status", "✅ Completed")}
     </table>
     <p style="color:#c8991a;font-size:14px;font-weight:600;">⚠️ Download your photos within 30 days — they will be permanently deleted after this period.</p>`,
    `${opts.baseUrl}/client/orders/${opts.orderId}`,
    "View & Download Photos"
  );
  await addEmailLog({ type: "order_completed", to: opts.clientEmail, subject, body: `Order completed: ${opts.address}, ${opts.photoCount} photos` });
  await sendViaResend(opts.clientEmail, subject, html);
}

export async function sendOrderStatusEmail(opts: {
  clientEmail: string; clientName: string; address: string;
  orderId: string; status: string; note?: string;
}): Promise<void> {
  const statusLabels: Record<string,string> = {
    in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled", pending: "Active"
  };
  const subject = `Order Update — ${opts.address}`;
  const html = emailWrapper(
    "Your Order Has Been Updated",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.clientName}, your order status has been updated.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Address", opts.address)}
       ${row("New Status", statusLabels[opts.status] ?? opts.status)}
       ${opts.note ? row("Note", opts.note) : ""}
     </table>`,
    `${BASE_URL}/client`,
    "View Order"
  );
  await addEmailLog({ type: `status_${opts.status}`, to: opts.clientEmail, subject, body: `Status: ${opts.status} for ${opts.address}` });
  await sendViaResend(opts.clientEmail, subject, html);
}

// ── BID EMAILS ────────────────────────────────────────────────

export async function sendBidPlacedEmail(opts: {
  clientEmail: string; clientName: string; address: string;
  agentName: string; bidAmount: number; orderId: string;
}): Promise<void> {
  const subject = `New Bid on Your Order — ${opts.address}`;
  const html = emailWrapper(
    "A Bid Has Been Placed on Your Order",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.clientName}, a field agent has placed a bid on your order.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Property", opts.address)}
       ${row("Agent", opts.agentName)}
       ${row("Bid Amount", `$${opts.bidAmount}`)}
     </table>
     <p style="color:#475569;font-size:14px;">Log in to your dashboard to review and accept or reject this bid.</p>`,
    `${BASE_URL}/client`,
    "Review Bid"
  );
  await addEmailLog({ type: "bid_placed", to: opts.clientEmail, subject, body: `Bid of $${opts.bidAmount} by ${opts.agentName}` });
  await sendViaResend(opts.clientEmail, subject, html);
}

export async function sendBidAcceptedEmail(opts: {
  agentEmail: string; agentName: string; address: string;
  bidAmount: number; orderId: string;
}): Promise<void> {
  const subject = `Your Bid Was Accepted — ${opts.address}`;
  const html = emailWrapper(
    "Your Bid Has Been Accepted!",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Congratulations ${opts.agentName}! Your bid has been accepted.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Property", opts.address)}
       ${row("Your Compensation", `$${opts.bidAmount}`)}
       ${row("Status", "✅ Order Assigned to You")}
     </table>
     <p style="color:#475569;font-size:14px;">Please proceed to the property and complete the inspection. Upload your photos through your agent dashboard.</p>`,
    `${BASE_URL}/agent`,
    "Go to Agent Dashboard"
  );
  await addEmailLog({ type: "bid_accepted", to: opts.agentEmail, subject, body: `Bid accepted: ${opts.address} at $${opts.bidAmount}` });
  await sendViaResend(opts.agentEmail, subject, html);
}

export async function sendBidRejectedEmail(opts: {
  agentEmail: string; agentName: string; address: string;
}): Promise<void> {
  const subject = `Bid Not Selected — ${opts.address}`;
  const html = emailWrapper(
    "Your Bid Was Not Selected",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.agentName}, another agent was selected for this order.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Property", opts.address)}
       ${row("Result", "Not selected")}
     </table>
     <p style="color:#475569;font-size:14px;">Keep an eye on your dashboard for new orders in your area.</p>`,
    `${BASE_URL}/agent`,
    "View Available Orders"
  );
  await addEmailLog({ type: "bid_rejected", to: opts.agentEmail, subject, body: `Bid not selected: ${opts.address}` });
  await sendViaResend(opts.agentEmail, subject, html);
}

export async function sendDispatchEmail(opts: {
  agentEmail: string; agentName: string; address: string;
  serviceType: string; compensationAmount: number; deadline: string; orderId: string; baseUrl: string;
}): Promise<void> {
  const subject = `New Order Assigned to You — ${opts.address}`;
  const html = emailWrapper(
    "A New Order Has Been Assigned to You",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.agentName}, a new order has been dispatched to you.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Address", opts.address)}
       ${row("Service", opts.serviceType)}
       ${row("Your Pay", `$${opts.compensationAmount}`)}
       ${row("Deadline", opts.deadline)}
     </table>
     <p style="color:#c8991a;font-size:14px;font-weight:600;">You have 3 hours to accept this order (9 AM–6 PM local time).</p>`,
    `${opts.baseUrl}/agent`,
    "Accept Order"
  );
  await addEmailLog({ type: "order_dispatched", to: opts.agentEmail, subject, body: `Dispatched: ${opts.address}` });
  await sendViaResend(opts.agentEmail, subject, html);
}

// ── AGENT APPROVAL ────────────────────────────────────────────

export async function sendAgentApprovedEmail(agent: { email: string; name: string }): Promise<void> {
  const subject = "Your Snapect Agent Account Has Been Approved!";
  const html = emailWrapper(
    "Welcome to the Snapect Agent Network!",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Congratulations ${agent.name}! Your sample photos have been reviewed and approved.</p>
     <p style="color:#475569;font-size:14px;margin-top:12px;">You can now:</p>
     <ul style="color:#475569;font-size:14px;line-height:2;">
       <li>Set your ZIP code coverage areas</li>
       <li>Toggle your availability status</li>
       <li>Accept or bid on orders in your area</li>
       <li>Get paid every Friday via PayPal</li>
     </ul>`,
    `${BASE_URL}/agent`,
    "Go to Agent Dashboard"
  );
  await addEmailLog({ type: "agent_approved", to: agent.email, subject, body: `Agent approved: ${agent.name}` });
  await sendViaResend(agent.email, subject, html);
}

export async function sendAgentRejectedEmail(agent: { email: string; name: string }, reason?: string): Promise<void> {
  const subject = "Update on Your Snapect Agent Application";
  const html = emailWrapper(
    "Application Update",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${agent.name}, thank you for applying to the Snapect agent network.</p>
     <p style="color:#475569;font-size:14px;">After reviewing your sample photos, we were unable to approve your application at this time.${reason ? ` <strong>Reason:</strong> ${reason}` : ""}</p>
     <p style="color:#475569;font-size:14px;margin-top:12px;">You may resubmit your sample photos from your agent dashboard. Please ensure photos are:</p>
     <ul style="color:#475569;font-size:14px;line-height:2;">
       <li>Clear and well-lit</li>
       <li>At least 1280×960 resolution</li>
       <li>Properly framed per the shot list</li>
     </ul>`,
    `${BASE_URL}/agent`,
    "Resubmit Samples"
  );
  await addEmailLog({ type: "agent_rejected", to: agent.email, subject, body: `Agent rejected: ${agent.name}` });
  await sendViaResend(agent.email, subject, html);
}

export async function sendDisputeResolutionEmail(opts: {
  email: string; name: string; orderAddress: string;
  resolution: "reshoot" | "wallet_credit" | "rejected" | "other";
  amount?: number; notes?: string;
}): Promise<void> {
  const subject = "Update on Your Dispute";
  const resolutionLabel = {
    reshoot: "We've scheduled a free reshoot",
    wallet_credit: `We've credited $${opts.amount ?? 0} to your Snapect wallet`,
    rejected: "We've reviewed your dispute",
    other: "We've reviewed your dispute",
  }[opts.resolution];
  const html = emailWrapper(
    "Dispute Resolved",
    `<p style="color:#475569;font-size:15px;line-height:1.7;">Hi ${opts.name}, we've reviewed your dispute regarding <strong>${opts.orderAddress}</strong>.</p>
     <table style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;border-collapse:separate;">
       ${row("Outcome", resolutionLabel)}
       ${opts.notes ? row("Notes", opts.notes) : ""}
     </table>
     <p style="color:#475569;font-size:13px;">Per Snapect policy, we don't issue cash refunds — outstanding issues are resolved through a free reshoot or wallet credit toward a future order. See our <a href="${BASE_URL}/refund-policy">Refund Policy</a> for details.</p>`,
    opts.resolution === "wallet_credit" ? `${BASE_URL}/client/wallet` : `${BASE_URL}/client`,
    opts.resolution === "wallet_credit" ? "View Wallet" : "Go to Dashboard"
  );
  await addEmailLog({ type: "dispute_resolved", to: opts.email, subject, body: `Dispute resolved (${opts.resolution}) for ${opts.name}` });
  await sendViaResend(opts.email, subject, html);
}

// ── ADMIN NOTIFICATIONS ───────────────────────────────────────

export async function sendAdminNotification(opts: {
  title: string; message: string; type: string;
}): Promise<void> {
  // Ntfy push notification
  await sendNtfyNotification({ title: opts.title, message: opts.message, priority: "high" });

  // Also email admin
  if (!ADMIN_EMAIL) return;
  const html = emailWrapper(
    opts.title,
    `<div style="background:#f8fafc;border-left:4px solid #c8991a;padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">
       <pre style="font-family:monospace;font-size:13px;color:#0f1f3d;white-space:pre-wrap;margin:0;">${opts.message}</pre>
     </div>
     <p style="color:#94a3b8;font-size:12px;">Log in to admin panel to take action.</p>`,
    `${BASE_URL}/admin`,
    "Go to Admin Panel"
  );
  await sendViaResend(ADMIN_EMAIL, `[Snapect Admin] ${opts.title}`, html);
}

export async function sendPaymentReceivedAdminEmail(opts: {
  clientName: string; clientEmail: string; amount: number; orderId: string; address: string;
}): Promise<void> {
  await sendAdminNotification({
    title: `💰 Payment Received — $${opts.amount}`,
    message: `Client: ${opts.clientName} (${opts.clientEmail})\nOrder: ${opts.orderId}\nAddress: ${opts.address}\nAmount: $${opts.amount}\n\nAction required: Confirm payment in admin panel to activate order.`,
    type: "payment_received",
  });
}
