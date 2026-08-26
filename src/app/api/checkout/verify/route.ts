import { NextResponse } from "next/server";
import { emailOrder, getOrderByRazorpayId, updateOrder } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

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

  const paid = await updateOrder(current.id, {
    status: "paid",
    paymentId,
    failureReason: "",
  });
  if (paid && current.status !== "paid") {
    try {
      await emailOrder(paid);
    } catch {
      /* order is saved even if mail fails */
    }
  }

  return NextResponse.json({
    ok: true,
    id: paid?.id ?? current.id,
    status: paid?.status ?? "paid",
  });
}
