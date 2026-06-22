import { store } from "./store";

export async function sendOrderEmail(
  type: "new_order" | "status_changed",
  data: { order: { id: string; address: string; status: string }; client: { email: string; name: string } | null | undefined; oldStatus?: string }
) {
  const subject =
    type === "new_order"
      ? `Order Confirmed — ${data.order.address}`
      : `Order Status Updated to "${data.order.status}" — ${data.order.address}`;

  const log = {
    timestamp: new Date().toISOString(),
    type,
    to: data.client?.email ?? "unknown",
    subject,
  };

  store.emailLog.push(log);

  console.log("[EMAIL STUB]", JSON.stringify(log, null, 2));

  return log;
}
