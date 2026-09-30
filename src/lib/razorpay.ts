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
      notes: { shop_order_id: receipt },
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

export type RazorpayPayment = {
  id?: string;
  status?: string;
  captured?: boolean;
  amount?: number;
  fee?: number;
  tax?: number;
  method?: string;
  vpa?: string;
  order_id?: string;
  created_at?: number;
  error_description?: string;
  error_reason?: string;
  currency?: string;
  email?: string;
  contact?: string;
  refund_status?: string | null;
  amount_refunded?: number;
  notes?: Record<string, string> | string | null;
};

export type RazorpaySettlement = {
  id?: string;
  amount?: number;
  fees?: number;
  tax?: number;
  utr?: string;
  status?: string;
  created_at?: number;
};

export type RazorpayReconItem = {
  entity_id?: string;
  type?: string;
  settled?: boolean;
  settled_at?: number | null;
  settlement_id?: string | null;
  settlement_utr?: string | null;
  payment_id?: string | null;
  order_id?: string | null;
};

async function razorpayGet<T>(path: string): Promise<{ ok: boolean; status: number; data: T }> {
  if (!razorpayConfigured()) {
    return { ok: false, status: 0, data: {} as T };
  }
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

const paymentCache = new Map<string, { at: number; payments: RazorpayPayment[] }>();

export async function fetchPayment(paymentId: string): Promise<{ http: number; payment: RazorpayPayment | null }> {
  if (!paymentId) return { http: 0, payment: null };
  const { ok, status, data } = await razorpayGet<RazorpayPayment & { error?: { description?: string } }>(
    `payments/${encodeURIComponent(paymentId)}`,
  );
  if (!ok || !data.id) return { http: status, payment: null };
  return { http: status, payment: data };
}

export async function fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayPayment[]> {
  const hit = paymentCache.get(razorpayOrderId);
  if (hit && Date.now() - hit.at < 4000) return hit.payments;
  const { ok, data } = await razorpayGet<{ items?: RazorpayPayment[]; error?: { description?: string } }>(
    `orders/${encodeURIComponent(razorpayOrderId)}/payments`,
  );
  const payments = ok && Array.isArray(data.items) ? data.items : [];
  paymentCache.set(razorpayOrderId, { at: Date.now(), payments });
  return payments;
}

export async function fetchSettlements(count = 8): Promise<RazorpaySettlement[]> {
  const { ok, data } = await razorpayGet<{ items?: RazorpaySettlement[] }>(`settlements?count=${count}`);
  if (!ok || !Array.isArray(data.items)) return [];
  return data.items;
}

export async function fetchSettlementRecon(year: number, month: number): Promise<RazorpayReconItem[]> {
  const { ok, data } = await razorpayGet<{ items?: RazorpayReconItem[] }>(
    `settlements/recon/combined?year=${year}&month=${month}&count=1000`,
  );
  if (!ok || !Array.isArray(data.items)) return [];
  return data.items;
}

export function unixToIso(value?: number | null): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}
