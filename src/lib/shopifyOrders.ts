import { DROP_ID } from "@/data/products";
import type { OrderItem, ShopOrder } from "@/lib/orderTypes";
import { getOrder, getOrderByPaymentId, listOrders, saveOrder, updateOrder } from "@/lib/orders";
import { notifyPaid } from "@/lib/notifyPaid";
import { adminRest, shopifyAdminConfigured, shopifyPublicOrigin, shopifyWebhookSecret } from "@/lib/shopify";

type ShopifyAddress = {
  name?: string;
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  phone?: string;
};

type ShopifyLine = {
  title?: string;
  quantity?: number;
  price?: string;
  sku?: string;
  variant_title?: string;
};

export type ShopifyRestOrder = {
  id?: number | string;
  name?: string;
  order_number?: number;
  email?: string;
  phone?: string;
  created_at?: string;
  financial_status?: string;
  total_price?: string;
  subtotal_price?: string;
  total_shipping_price_set?: { shop_money?: { amount?: string } };
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  customer?: { first_name?: string; last_name?: string; email?: string; phone?: string };
  line_items?: ShopifyLine[];
};

function money(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function personName(order: ShopifyRestOrder): string {
  const ship = order.shipping_address;
  const fromShip = [ship?.first_name, ship?.last_name].filter(Boolean).join(" ").trim() || ship?.name?.trim();
  if (fromShip) return fromShip;
  const customer = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ").trim();
  return customer || "Shopify customer";
}

function addressLine(order: ShopifyRestOrder): string {
  const ship = order.shipping_address ?? order.billing_address;
  return [ship?.address1, ship?.address2].filter(Boolean).join(", ");
}

function withFrameFrom(line: ShopifyLine): boolean {
  const blob = `${line.sku ?? ""} ${line.variant_title ?? ""} ${line.title ?? ""}`.toLowerCase();
  return /\b(frame|framed)\b/.test(blob) && !/\b(no[- ]?frame|without)\b/.test(blob);
}

function productIdFrom(line: ShopifyLine): string {
  const sku = (line.sku ?? "").toLowerCase();
  const match = sku.match(/^(po-[a-z0-9]+)/);
  if (match?.[1]) return match[1] === "po-drop" ? DROP_ID : match[1];
  return sku || "shopify";
}

export function shopifyOrderId(order: ShopifyRestOrder): string {
  if (order.order_number) return `shopify-${order.order_number}`;
  return `shopify-${order.id ?? order.name ?? "order"}`;
}

function statusOf(order: ShopifyRestOrder): ShopOrder["status"] {
  const status = (order.financial_status ?? "").toLowerCase();
  if (status === "paid" || status === "partially_paid" || status === "authorized") return "paid";
  if (status === "voided" || status === "refunded" || status === "expired") return "failed";
  return "pending";
}

export function mapShopifyOrder(order: ShopifyRestOrder): ShopOrder {
  const ship = order.shipping_address ?? order.billing_address;
  const paid = statusOf(order) === "paid";
  const createdAt = order.created_at ?? new Date().toISOString();
  const items: OrderItem[] = (order.line_items ?? []).map((line) => ({
    productId: productIdFrom(line),
    name: line.title ?? "Puzzle",
    withFrame: withFrameFrom(line),
    qty: Math.max(1, Math.floor(Number(line.quantity) || 1)),
    unitPrice: money(line.price),
  }));
  return {
    id: shopifyOrderId(order),
    createdAt,
    status: statusOf(order),
    name: personName(order),
    email: order.email || order.customer?.email || "",
    phone: (order.phone || ship?.phone || order.customer?.phone || "").replace(/\D/g, ""),
    address: addressLine(order),
    pincode: ship?.zip,
    city: ship?.city,
    state: ship?.province,
    utr: "",
    subtotal: money(order.subtotal_price),
    shippingFee: money(order.total_shipping_price_set?.shop_money?.amount),
    total: money(order.total_price),
    items,
    paymentId: order.id ? String(order.id) : undefined,
    paymentMethod: "shopify",
    verifiedAt: paid ? createdAt : undefined,
    capturedAt: paid ? createdAt : undefined,
    settledAt: paid ? createdAt : undefined,
  };
}

export async function listShopifyOrders(): Promise<ShopOrder[]> {
  if (!shopifyAdminConfigured()) return [];
  const data = await adminRest<{ orders?: ShopifyRestOrder[] }>("/orders.json?status=any&limit=80");
  return (data.orders ?? []).map(mapShopifyOrder);
}

export async function importShopifyOrders(): Promise<ShopOrder[]> {
  const remote = await listShopifyOrders();
  for (const order of remote) {
    const existing =
      (await getOrder(order.id)) ?? (order.paymentId ? await getOrderByPaymentId(order.paymentId) : null);
    if (!existing) {
      await saveOrder(order);
      if (order.status === "paid") {
        try {
          await notifyPaid({ ...order, status: "pending" }, order);
        } catch {
          /* keep import going */
        }
      }
      continue;
    }
    if (existing.status !== order.status || existing.address !== order.address) {
      const next = await updateOrder(existing.id, order);
      if (existing.status !== "paid" && next?.status === "paid") {
        try {
          await notifyPaid(existing, next);
        } catch {
          /* keep import going */
        }
      }
    }
  }
  return listOrders();
}

export async function upsertShopifyWebhookOrder(raw: ShopifyRestOrder): Promise<ShopOrder> {
  const order = mapShopifyOrder(raw);
  const existing =
    (await getOrder(order.id)) ?? (order.paymentId ? await getOrderByPaymentId(order.paymentId) : null);
  if (!existing) {
    await saveOrder(order);
    if (order.status === "paid") {
      await notifyPaid({ ...order, status: "pending" }, order);
    }
    return order;
  }
  const next = (await updateOrder(existing.id, order)) ?? existing;
  if (existing.status !== "paid" && next.status === "paid") {
    await notifyPaid(existing, next);
  }
  return next;
}

export async function ensureShopifyWebhooks(): Promise<{ ok: boolean; topics: string[] }> {
  if (!shopifyAdminConfigured() || !shopifyWebhookSecret()) {
    return { ok: false, topics: [] };
  }
  const address = `${shopifyPublicOrigin()}/api/shopify/webhook`;
  const wanted = ["orders/paid", "orders/updated"];
  const existing = await adminRest<{ webhooks?: Array<{ id: number; topic: string; address: string }> }>(
    "/webhooks.json",
  );
  const have = new Set(
    (existing.webhooks ?? [])
      .filter((hook) => hook.address === address)
      .map((hook) => hook.topic),
  );
  const topics: string[] = [...have];
  for (const topic of wanted) {
    if (have.has(topic)) continue;
    await adminRest("/webhooks.json", {
      method: "POST",
      body: JSON.stringify({
        webhook: { topic, address, format: "json" },
      }),
    });
    topics.push(topic);
  }
  return { ok: true, topics };
}
