import { NextResponse } from "next/server";
import { emailOrder, getOrderByRazorpayId, updateOrder } from "@/lib/orders";
import { razorpayWebhookSecret, verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

type RazorpayEntity = {
  id?: string;
  order_id?: string;
  status?: string;
  error_description?: string;
  error_reason?: string;
};

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (razorpayWebhookSecret() && !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: RazorpayEntity } };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  const entity = payload.payload?.payment?.entity;
  const razorpayOrderId = entity?.order_id ?? "";
  if (!razorpayOrderId) {
    return NextResponse.json({ ok: true });
  }

  const current = await getOrderByRazorpayId(razorpayOrderId);
  if (!current) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event ?? "";
  if (event === "payment.captured" || entity?.status === "captured") {
    const paid = await updateOrder(current.id, {
      status: "paid",
      paymentId: entity?.id,
      failureReason: "",
    });
    if (paid && current.status !== "paid") {
      try {
        await emailOrder(paid);
      } catch {
        /* keep webhook 200 */
      }
    }
  } else if (event === "payment.failed" && current.status !== "paid") {
    await updateOrder(current.id, {
      status: "failed",
      failureReason: entity?.error_description || entity?.error_reason || "Payment failed",
    });
  }

  return NextResponse.json({ ok: true });
}
