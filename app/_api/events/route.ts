import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const userRole = cookieStore.get("user_role")?.value;

  if (!userId || !userRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      function sendEvent(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      }

      sendEvent("connected", { ok: true, role: userRole });

      function getSnapshot() {
        const orders = store.orders.filter((o) => {
          if (userRole === "admin") return true;
          if (userRole === "client") return o.clientId === userId;
          if (userRole === "agent") return o.assignedAgentId === userId || o.status === "pending";
          return false;
        });

        return orders.map((o) => {
          const client = store.users.find((u) => u.id === o.clientId);
          const agent = o.assignedAgentId ? store.users.find((u) => u.id === o.assignedAgentId) : null;
          return {
            id: o.id,
            status: o.status,
            address: o.address,
            serviceType: o.serviceType,
            turnaroundTier: o.turnaroundTier,
            totalPrice: o.totalPrice,
            assignedAgentId: o.assignedAgentId,
            photos: o.photos,
            createdAt: o.createdAt,
            client: client ? { name: client.name, email: client.email } : null,
            agent: agent ? { name: agent.name } : null,
          };
        });
      }

      let lastSnapshot = JSON.stringify(getSnapshot());
      sendEvent("orders", JSON.parse(lastSnapshot));

      intervalId = setInterval(() => {
        if (closed) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        const current = JSON.stringify(getSnapshot());
        if (current !== lastSnapshot) {
          lastSnapshot = current;
          sendEvent("orders", JSON.parse(current));
        }
        sendEvent("ping", { ts: Date.now() });
      }, 3000);
    },
    cancel() {
      closed = true;
      if (intervalId) clearInterval(intervalId);
    },
  });

  req.signal.addEventListener("abort", () => {
    closed = true;
    if (intervalId) clearInterval(intervalId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
