import { createHmac, timingSafeEqual } from "crypto";

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export function razorpayKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET ?? "";
}

export function razorpayWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
}

export function razorpayConfigured(): boolean {
  return Boolean(razorpayKeyId() && razorpayKeySecret());
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${razorpayKeyId()}:${razorpayKeySecret()}`).toString("base64")}`;
}

export async function createRazorpayOrder(amountInr: number, receipt: string) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInr * 100,
      currency: "INR",
      receipt,
      payment_capture: 1,
    }),
  });
  const data = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.description ?? `Razorpay order failed (${res.status})`);
  }
  return data.id;
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = razorpayKeySecret();
  if (!secret || !params.signature) return false;
  const expected = createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = razorpayWebhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
