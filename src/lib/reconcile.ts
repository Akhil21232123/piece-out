import type { BankDeposit, ShopOrder } from "@/lib/orderTypes";
import { notifyPaid } from "@/lib/notifyPaid";
import { getOrder, listOrders, updateOrder } from "@/lib/orders";
import { findCapturedPayment } from "@/lib/paymentProof";
import { retryUnshipped } from "@/lib/shipping";
import {
  fetchSettlementRecon,
  fetchSettlements,
  razorpayConfigured,
  unixToIso,
  type RazorpayPayment,
  type RazorpayReconItem,
} from "@/lib/razorpay";

export type ReconcileResult = {
  synced: number;
  captured: number;
  settled: number;
  shipped: number;
  bank: BankDeposit | null;
};

let reconAt = 0;
let reconItems: RazorpayReconItem[] = [];
let bankAt = 0;
let bankCache: BankDeposit | null = null;

function proofPatch(payment: RazorpayPayment): Partial<ShopOrder> {
  return {
    status: "paid",
    paymentId: payment.id,
    capturedAt: unixToIso(payment.created_at) || new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    paymentMethod: payment.method,
    paymentVpa: payment.vpa,
    razorpayAmountPaise: payment.amount,
    failureReason: "",
  };
}

async function markCaptured(order: ShopOrder, payment: RazorpayPayment): Promise<boolean> {
  const already =
    order.status === "paid" && order.paymentId === payment.id && order.verifiedAt && order.capturedAt;
  if (already) return false;
  const paid = await updateOrder(order.id, proofPatch(payment));
  await notifyPaid(order, paid);
  return Boolean(paid && order.status !== "paid");
}

async function markSettled(order: ShopOrder, item: RazorpayReconItem): Promise<boolean> {
  if (!item.settled) return false;
  const settlementUtr = item.settlement_utr ?? order.settlementUtr;
  if (order.settlementUtr && order.settlementUtr === settlementUtr) return false;
  const paid = await updateOrder(order.id, {
    status: "paid",
    paymentId: order.paymentId || item.entity_id || item.payment_id || undefined,
    capturedAt: order.capturedAt || unixToIso(item.settled_at) || new Date().toISOString(),
    settledAt: unixToIso(item.settled_at) || new Date().toISOString(),
    settlementId: item.settlement_id ?? order.settlementId,
    settlementUtr: settlementUtr || undefined,
    failureReason: "",
  });
  await notifyPaid(order, paid);
  return Boolean(paid);
}

export async function syncOrderFromRazorpay(order: ShopOrder): Promise<ShopOrder> {
  if (!razorpayConfigured() || (!order.razorpayOrderId && !order.paymentId)) return order;
  const match = await findCapturedPayment(order);
  if (match.ok) {
    await markCaptured(order, match.payment);
    return (await getOrder(order.id)) ?? order;
  }
  if (match.unreachable) return order;
  if (order.status === "paid" && !order.verifiedAt) {
    await updateOrder(order.id, {
      status: "pending",
      failureReason: `Not captured at Razorpay. ${match.reason}`,
    });
    return (await getOrder(order.id)) ?? order;
  }
  if (order.status === "pending") {
    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    if (ageMs > 45 * 60 * 1000 && /failed/i.test(match.reason)) {
      await updateOrder(order.id, {
        status: "failed",
        failureReason: match.reason,
      });
      return (await getOrder(order.id)) ?? order;
    }
  }
  return order;
}

function monthKeys(now = new Date()) {
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const prevDate = new Date(Date.UTC(current.year, current.month - 2, 1));
  return [current, { year: prevDate.getUTCFullYear(), month: prevDate.getUTCMonth() + 1 }];
}

async function loadRecon(force = false): Promise<RazorpayReconItem[]> {
  if (!force && reconAt && Date.now() - reconAt < 60_000) return reconItems;
  const batches = await Promise.all(monthKeys().map((key) => fetchSettlementRecon(key.year, key.month)));
  reconItems = batches.flat();
  reconAt = Date.now();
  return reconItems;
}

export async function loadBankDeposits(force = false): Promise<BankDeposit | null> {
  if (!force && Date.now() - bankAt < 60_000) return bankCache;
  const rows = await fetchSettlements(8);
  const processed = rows.find((row) => row.status === "processed" && row.utr) ?? rows[0];
  bankCache = processed?.id
    ? {
        id: processed.id,
        amountInr: Math.round((processed.amount ?? 0) / 100),
        feesInr: Math.round((processed.fees ?? 0) / 100),
        utr: processed.utr ?? "",
        at: unixToIso(processed.created_at) ?? new Date().toISOString(),
        status: processed.status ?? "",
      }
    : null;
  bankAt = Date.now();
  return bankCache;
}

function reconForOrder(order: ShopOrder, items: RazorpayReconItem[]): RazorpayReconItem | undefined {
  return items.find((item) => {
    if (item.type && item.type !== "payment") return false;
    if (order.paymentId && (item.entity_id === order.paymentId || item.payment_id === order.paymentId)) {
      return true;
    }
    return Boolean(order.razorpayOrderId && item.order_id === order.razorpayOrderId);
  });
}

export async function reconcileOrders(
  force = false,
  opts: { ship?: boolean } = {},
): Promise<ReconcileResult> {
  const empty: ReconcileResult = { synced: 0, captured: 0, settled: 0, shipped: 0, bank: null };
  if (!razorpayConfigured()) return empty;

  const orders = await listOrders();
  let captured = 0;
  let settled = 0;
  let synced = 0;

  const needsPaymentSync = orders.filter(
    (order) =>
      (order.razorpayOrderId || order.paymentId) &&
      (order.status === "pending" || (order.status === "paid" && !order.verifiedAt)),
  );
  for (const order of needsPaymentSync.slice(0, 40)) {
    const next = await syncOrderFromRazorpay(order);
    synced += 1;
    if (order.status !== "paid" && next.status === "paid") captured += 1;
  }

  const recon = await loadRecon(force);
  const latest = await listOrders();
  for (const order of latest) {
    if (order.status === "failed") continue;
    const item = reconForOrder(order, recon);
    if (!item) continue;
    if (await markSettled(order, item)) settled += 1;
  }

  const shipped = opts.ship === false ? 0 : await retryUnshipped(await listOrders());

  return {
    synced,
    captured,
    settled,
    shipped,
    bank: await loadBankDeposits(force),
  };
}
