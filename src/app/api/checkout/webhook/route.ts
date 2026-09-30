import { NextResponse } from "next/server";
import { getOrderByRazorpayId, updateOrder } from "@/lib/orders";
import { notifyPaid } from "@/lib/notifyPaid";
import { matchCapturedPayment } from "@/lib/paymentProof";
import { reconcileOrders } from "@/lib/reconcile";
import {
  fetchPayment,
  razorpayWebhookSecret,
  unixToIso,
  verifyWebhookSignature,
} from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const secret = razorpayWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  }
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; status?: string; error_description?: string; error_reason?: string } };
      settlement?: { entity?: { id?: string; utr?: string; status?: string } };
    };
  };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  const event = payload.event ?? "";
  if (event === "settlement.processed" || event === "settlement.created") {
    try {
      await reconcileOrders(true);
    } catch {
      /* keep webhook 200 */
    }
    return NextResponse.json({ ok: true });
  }

  const entity = payload.payload?.payment?.entity;
  const paymentId = entity?.id ?? "";
  const razorpayOrderId = entity?.order_id ?? "";
  if (!razorpayOrderId) {
    return NextResponse.json({ ok: true });
  }

  const current = await getOrderByRazorpayId(razorpayOrderId);
  if (!current) {
    return NextResponse.json({ ok: true });
  }

  if (event === "payment.captured" || entity?.status === "captured") {
    const live = paymentId ? await fetchPayment(paymentId) : { http: 0, payment: null };
    if (live.http === 0 || live.http >= 500) {
      return NextResponse.json({ ok: true, pending: "razorpay_fetch" });
    }
    if (!live.payment) {
      return NextResponse.json({ ok: true });
    }
    const match = matchCapturedPayment(live.payment, current);
    if (!match.ok) {
      return NextResponse.json({ ok: true, ignored: match.reason });
    }
    const paid = await updateOrder(current.id, {
      status: "paid",
      paymentId: match.payment.id,
      capturedAt: current.capturedAt || unixToIso(match.payment.created_at) || new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      paymentMethod: match.payment.method,
      paymentVpa: match.payment.vpa,
      razorpayAmountPaise: match.payment.amount,
      failureReason: "",
    });
    await notifyPaid(current, paid);
  } else if (event === "payment.failed" && current.status !== "paid") {
    await updateOrder(current.id, {
      status: "failed",
      failureReason: entity?.error_description || entity?.error_reason || "Payment failed",
    });
  }

  return NextResponse.json({ ok: true });
}
