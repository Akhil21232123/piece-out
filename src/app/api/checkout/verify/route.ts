import { NextResponse } from "next/server";
import { getOrderByRazorpayId, updateOrder } from "@/lib/orders";
import { notifyPaid } from "@/lib/notifyPaid";
import { matchCapturedPayment } from "@/lib/paymentProof";
import { fetchPayment, unixToIso, verifyPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
  }

  const payload = body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  const orderId = payload.razorpay_order_id ?? "";
  const paymentId = payload.razorpay_payment_id ?? "";
  const signature = payload.razorpay_signature ?? "";

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  const current = await getOrderByRazorpayId(orderId);
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { http, payment } = await fetchPayment(paymentId);
  if (http === 0 || http >= 500) {
    return NextResponse.json({ error: "Could not confirm payment with Razorpay. Try again." }, { status: 502 });
  }
  if (!payment) {
    return NextResponse.json({ error: "Razorpay has no such payment." }, { status: 400 });
  }
  const match = matchCapturedPayment(payment, current);
  if (!match.ok) {
    return NextResponse.json({ error: match.reason }, { status: 400 });
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

  return NextResponse.json({
    ok: true,
    id: paid?.id ?? current.id,
    status: paid?.status ?? "paid",
  });
}
