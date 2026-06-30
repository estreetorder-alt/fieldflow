// Ntfy.sh — free push notifications, no account required
// Messages go to your ntfy.sh topic which you subscribe to on phone/desktop

const NTFY_TOPIC = process.env.NTFY_TOPIC || "fieldflow-payments";
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

export async function sendNtfyNotification(opts: {
  title: string;
  message: string;
  priority?: "low" | "default" | "high" | "urgent";
  tags?: string[];
}) {
  try {
    await fetch(NTFY_URL, {
      method: "POST",
      headers: {
        "Title": opts.title,
        "Priority": opts.priority ?? "default",
        "Tags": (opts.tags ?? []).join(","),
        "Content-Type": "text/plain",
      },
      body: opts.message,
    });
  } catch {
    // Fail silently — notifications are not critical
  }
}

export async function notifyPaymentReceived(opts: {
  clientName: string;
  amount: number;
  address: string;
  orderId: string;
}) {
  await sendNtfyNotification({
    title: `💰 Payment Received — $${opts.amount}`,
    message: `Client: ${opts.clientName}\nOrder: ${opts.orderId}\nAddress: ${opts.address}\nAmount: $${opts.amount}\n\nLogin to admin panel to confirm order.`,
    priority: "high",
    tags: ["moneybag", "white_check_mark"],
  });
}

export async function notifyOrderPlaced(opts: {
  clientName: string;
  address: string;
  service: string;
  orderId: string;
}) {
  await sendNtfyNotification({
    title: `📋 New Order — ${opts.service}`,
    message: `Client: ${opts.clientName}\nOrder: ${opts.orderId}\nService: ${opts.service}\nAddress: ${opts.address}\n\nOrder is under review — waiting for payment confirmation.`,
    priority: "default",
    tags: ["clipboard"],
  });
}

export async function notifyBidPlaced(opts: {
  agentName: string;
  amount: number;
  address: string;
}) {
  await sendNtfyNotification({
    title: `🎯 Bid Placed — $${opts.amount}`,
    message: `Agent: ${opts.agentName}\nAmount: $${opts.amount}\nAddress: ${opts.address}`,
    priority: "low",
    tags: ["dart"],
  });
}
