import type { ShopOrder } from "./orderTypes";
import { emailCustomer } from "./customerEmail";
import { emailInbox, emailOrder } from "./orders";
import { bookShipmentIfNeeded } from "./shipping";
import { createShopifyPaidOrder } from "./shopifyPush";

async function takeStock(order: ShopOrder) {
  try {
    const { applyPaidOrder, stockAlerts, LOW_STOCK_AT } = await import("./inventory");
    const alerts = stockAlerts(await applyPaidOrder(order));
    for (const alert of alerts) {
      const soldOut = alert.kind === "sold_out";
      const subject = soldOut
        ? `piece/out · SOLD OUT · ${alert.name}`
        : `piece/out · low stock · ${alert.name} (${alert.after} left)`;
      const text = soldOut
        ? `${alert.name} just hit 0 after order ${order.id}.\n\nThe site now shows it as sold out with "notify me". Restock it in /admin → stock and it goes live again.`
        : `${alert.name} is down to ${alert.after} after order ${order.id} (alert at ${LOW_STOCK_AT}).\n\nUpdate the count in /admin → stock when new cans come in.`;
      await emailInbox(subject, text).catch((error) => console.error("stock email", error));
    }
  } catch (error) {
    console.error("inventory update", order.id, error);
  }
}

export async function notifyPaid(previous: ShopOrder, next: ShopOrder | null) {
  if (!next || next.status !== "paid") return;
  // Idempotent: each order is only ever taken off stock once (inventory_moves), even when
  // settlement/reconcile calls this again for an already-paid order.
  await takeStock(next);
  let current = next;
  try {
    current = await bookShipmentIfNeeded(next);
  } catch {
    /* shippingError is stored when booking fails */
  }
  if (previous.status === "paid") return;
  try {
    current = await createShopifyPaidOrder(current);
  } catch (err) {
    console.error("shopify paid copy", current.id, err);
  }
  try {
    await emailOrder(current);
  } catch {
    /* dashboard still updates */
  }
  try {
    await emailCustomer(current);
  } catch (err) {
    console.error("customer email", current.id, err);
  }
}
