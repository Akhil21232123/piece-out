import type { ShopOrder } from "@/lib/orderTypes";
import { fetchOrderPayments, fetchPayment, type RazorpayPayment } from "@/lib/razorpay";

export type PaymentMatch =
  | { ok: true; payment: RazorpayPayment; http: number }
  | { ok: false; reason: string; http: number; unreachable?: boolean };

function notesShopId(payment: RazorpayPayment): string {
  const notes = payment.notes;
  if (!notes || typeof notes === "string") return "";
  return notes.shop_order_id ?? "";
}

export function matchCapturedPayment(payment: RazorpayPayment, order: ShopOrder): PaymentMatch {
  if (!payment.id?.startsWith("pay_")) {
    return { ok: false, reason: "Invalid Razorpay payment id.", http: 200 };
  }
  if (payment.status !== "captured" && payment.captured !== true) {
    return {
      ok: false,
      reason: `Razorpay status is ${payment.status ?? "unknown"}, not captured.`,
      http: 200,
    };
  }
  if (order.razorpayOrderId && payment.order_id && payment.order_id !== order.razorpayOrderId) {
    return { ok: false, reason: "Payment belongs to a different Razorpay order.", http: 200 };
  }
  if (payment.amount !== order.total * 100) {
    return {
      ok: false,
      reason: `Amount mismatch: Razorpay ₹${((payment.amount ?? 0) / 100).toFixed(0)} vs order ₹${order.total}.`,
      http: 200,
    };
  }
  if (payment.currency && payment.currency !== "INR") {
    return { ok: false, reason: `Currency is ${payment.currency}, not INR.`, http: 200 };
  }
  const shopId = notesShopId(payment);
  if (shopId && shopId !== order.id) {
    return { ok: false, reason: "Payment notes do not match this shop order.", http: 200 };
  }
  if (payment.refund_status === "full") {
    return { ok: false, reason: "Payment was fully refunded at Razorpay.", http: 200 };
  }
  return { ok: true, payment, http: 200 };
}

export async function findCapturedPayment(order: ShopOrder): Promise<PaymentMatch> {
  if (order.paymentId) {
    const { http, payment } = await fetchPayment(order.paymentId);
    if (http === 0 || http >= 500) {
      return { ok: false, reason: "Razorpay did not respond.", http, unreachable: true };
    }
    if (!payment) {
      return { ok: false, reason: "Razorpay has no payment with that id.", http };
    }
    return matchCapturedPayment(payment, order);
  }
  if (!order.razorpayOrderId) {
    return { ok: false, reason: "No Razorpay order id.", http: 200 };
  }
  const payments = await fetchOrderPayments(order.razorpayOrderId);
  const captured = payments.find((row) => row.status === "captured" || row.captured);
  if (!captured) {
    if (!payments.length) {
      return { ok: false, reason: "Razorpay has no payments on this order.", http: 200 };
    }
    return {
      ok: false,
      reason: `Razorpay payments: ${payments.map((row) => row.status ?? "unknown").join(", ")}.`,
      http: 200,
    };
  }
  return matchCapturedPayment(captured, order);
}
