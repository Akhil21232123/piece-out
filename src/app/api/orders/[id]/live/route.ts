import { getOrder } from "@/lib/orders";
import { syncOrderFromRazorpay } from "@/lib/reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for (let i = 0; i < 80; i++) {
          if (request.signal.aborted) break;
          let order = await getOrder(id);
          if (!order) {
            send({ error: "Order not found." });
            break;
          }
          if (i % 4 === 0 && order.status === "pending" && order.razorpayOrderId) {
            try {
              order = await syncOrderFromRazorpay(order);
              order = (await getOrder(id)) ?? order;
            } catch {
              /* keep polling stored status */
            }
          }
          send({
            id: order.id,
            status: order.status,
            total: order.total,
            confirming: Boolean(order.utr) && order.status === "pending",
            failureReason: order.failureReason ?? "",
          });
          if (order.status === "paid" || order.status === "failed") break;
          await sleep(500);
        }
      } catch {
        /* client dropped the stream */
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
