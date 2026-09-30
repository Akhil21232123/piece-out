import { productMerchandiseId } from "@/data/products";
import type { ShopOrder } from "@/lib/orderTypes";
import { listOrders, updateOrder } from "@/lib/orders";
import { loadCatalog, merchandiseIdFor } from "@/lib/shopifyCatalog";
import { adminRest, shopifyAdminConfigured } from "@/lib/shopify";

function variantNumericId(gid?: string): number | undefined {
  if (!gid) return undefined;
  const raw = gid.split("/").pop() ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "Customer",
    last_name: parts.slice(1).join(" ") || "pieceout",
  };
}

function rupees(amount?: number): string {
  return Math.max(0, Math.round(amount ?? 0)).toFixed(2);
}

export function shouldPushToShopify(order: ShopOrder): boolean {
  if (order.status !== "paid") return false;
  if (order.shopifyOrderId) return false;
  if (order.paymentMethod === "shopify") return false;
  if (order.id.startsWith("shopify-")) return false;
  return true;
}

export async function createShopifyPaidOrder(order: ShopOrder): Promise<ShopOrder> {
  if (!shopifyAdminConfigured() || !shouldPushToShopify(order)) return order;

  const { products } = await loadCatalog();
  const names = splitName(order.name);
  const phone = order.phone.replace(/\D/g, "");
  const e164 = phone.length === 10 ? `+91${phone}` : phone ? `+${phone}` : undefined;
  const address = {
    ...names,
    address1: order.address,
    city: order.city || "India",
    province: order.state || "",
    country: "India",
    country_code: "IN",
    zip: order.pincode || "",
    phone: e164,
  };

  const line_items = order.items.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    const gid =
      item.merchandiseId ||
      (product ? merchandiseIdFor(product, item.withFrame) || productMerchandiseId(product, item.withFrame) : undefined);
    const variant_id = variantNumericId(gid);
    const title = `${item.name}${item.withFrame ? " · framed" : ""}`;
    if (variant_id) {
      return {
        variant_id,
        quantity: item.qty,
        price: rupees(item.unitPrice),
      };
    }
    return {
      title,
      quantity: item.qty,
      price: rupees(item.unitPrice),
      requires_shipping: true,
    };
  });

  const payload = {
    order: {
      email: order.email,
      phone: e164,
      financial_status: "paid",
      inventory_behaviour: "decrement_obeying_policy",
      send_receipt: false,
      send_fulfillment_receipt: false,
      tags: "pieceout,razorpay",
      note: [
        `pieceout ${order.id}`,
        order.razorpayOrderId ? `Razorpay ${order.razorpayOrderId}` : "",
        order.paymentId ? `pay ${order.paymentId}` : "",
        order.awb ? `AWB ${order.awb}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      note_attributes: [
        { name: "pieceout_id", value: order.id },
        { name: "razorpay_order_id", value: order.razorpayOrderId ?? "" },
        { name: "razorpay_payment_id", value: order.paymentId ?? "" },
      ],
      line_items,
      shipping_address: address,
      billing_address: address,
      shipping_lines: [
        {
          title: order.shippingPartner || "Delhivery",
          code: "DELHIVERY",
          price: rupees(order.shippingFee),
        },
      ],
      transactions: [
        {
          kind: "sale",
          status: "success",
          amount: rupees(order.total),
          gateway: "razorpay",
        },
      ],
    },
  };

  const created = await adminRest<{ order?: { id?: number | string; name?: string } }>("/orders.json", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const remoteId = created.order?.id;
  if (!remoteId) {
    throw new Error("Shopify did not return an order id.");
  }
  return (
    (await updateOrder(order.id, {
      shopifyOrderId: String(remoteId),
    })) ?? { ...order, shopifyOrderId: String(remoteId) }
  );
}

export async function backfillPaidOrdersToShopify(): Promise<number> {
  if (!shopifyAdminConfigured()) return 0;
  const orders = await listOrders();
  let pushed = 0;
  for (const order of orders) {
    if (!shouldPushToShopify(order)) continue;
    try {
      await createShopifyPaidOrder(order);
      pushed += 1;
    } catch (err) {
      console.error("shopify backfill", order.id, err);
    }
  }
  return pushed;
}
