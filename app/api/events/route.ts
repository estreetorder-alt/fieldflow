import { NextRequest } from "next/server";
import { getAllOrders, getOrdersByClientId, getOrdersByAgentId } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch { closed = true; }
      };

      send("connected", JSON.stringify({ ok: true }));

      const push = async () => {
        if (closed) { clearInterval(intervalId); return; }
        try {
          let orders;
          if (userRole === "admin") orders = await getAllOrders();
          else if (userRole === "client") {
            const { data: subs } = await supabase.from("users").select("id").eq("parent_client_id", userId!);
            const subIds = (subs ?? []).map(s => (s as Record<string,unknown>).id as string);
            const results = await Promise.all([userId!, ...subIds].map(id => getOrdersByClientId(id)));
            orders = results.flat().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          }
          else orders = await getOrdersByAgentId(userId!);
          send("orders", JSON.stringify(orders));
        } catch { /* ignore */ }
      };

      push();
      intervalId = setInterval(push, 5000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(intervalId);
        try { controller.close(); } catch { /* ignore */ }
      });
    },
    cancel() {
      closed = true;
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
