import type { ShopOrder } from "./orderTypes";
import { emailOrder } from "./orders";
import { bookShipmentIfNeeded } from "./shipping";
import { createShopifyPaidOrder } from "./shopifyPush";

export async function notifyPaid(previous: ShopOrder, next: ShopOrder | null) {
  if (!next || next.status !== "paid") return;
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
}
