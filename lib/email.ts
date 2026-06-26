import { addEmailLog } from "./db";

export async function sendEmail(opts: {
  to: string; subject: string; body: string; type: string;
}): Promise<void> {
  await addEmailLog({ type: opts.type, to: opts.to, subject: opts.subject, body: opts.body });
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "FieldFlow <noreply@fieldflow.app>", to: [opts.to], subject: opts.subject, text: opts.body }),
    });
  } catch { /* fail silently */ }
}

export async function sendOrderCompletionEmail(opts: {
  clientEmail: string; clientName: string; address: string; orderId: string; photoCount: number; baseUrl: string;
}): Promise<void> {
  await sendEmail({
    type: "order_completed", to: opts.clientEmail,
    subject: `Your Photos Are Ready — ${opts.address}`,
    body: `Hi ${opts.clientName},\n\nYour order for ${opts.address} has been completed.\n${opts.photoCount} photo(s) are ready for download.\n\nView & download: ${opts.baseUrl}/client/orders/${opts.orderId}\n\nPhotos are available for 30 days.\n\nThank you,\nFieldFlow`,
  });
}

export async function sendDispatchEmail(opts: {
  agentEmail: string; agentName: string; address: string; serviceType: string;
  compensationAmount: number; deadline: string; orderId: string; baseUrl: string;
}): Promise<void> {
  await sendEmail({
    type: "order_dispatched", to: opts.agentEmail,
    subject: `New Order Dispatched to You — ${opts.address}`,
    body: `Hi ${opts.agentName},\n\nA new order has been dispatched:\n\nAddress: ${opts.address}\nService: ${opts.serviceType}\nYour Pay: $${opts.compensationAmount}\nDeadline: ${opts.deadline}\n\nYou have 3 hours to accept.\nLogin: ${opts.baseUrl}/agent\n\nFieldFlow`,
  });
}

export async function sendBidEmail(opts: {
  clientEmail: string; address: string; agentName: string; bidAmount: number; baseUrl: string;
}): Promise<void> {
  await sendEmail({
    type: "bid_placed", to: opts.clientEmail,
    subject: `New Bid on Your Order — ${opts.address}`,
    body: `Agent ${opts.agentName} placed a bid of $${opts.bidAmount} on ${opts.address}.\n\nReview: ${opts.baseUrl}/client\n\nFieldFlow`,
  });
}
