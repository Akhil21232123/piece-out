import { emailShipped } from "./customerEmail";
import { type Fulfillment, listFulfillment, setFulfillment, stillToShip } from "./fulfillment";
import type { ShopOrder } from "./orderTypes";
import { listOrders, updateOrder } from "./orders";
import {
  bookShipmentIfNeeded,
  cancelWaybills,
  requestPickup,
  shippingConfigured,
  trackWaybills,
  trackingUrlFor,
} from "./shipping";

/**
 * Everything /admin/ship does: what still has to go out, labels, one pickup per day,
 * and watching Delhivery so customers get a "shipped" email the moment a parcel is scanned.
 */

export type ShipRow = {
  id: string;
  createdAt: string;
  name: string;
  city: string;
  pincode: string;
  items: string;
  total: number;
  awb: string;
  partner: string;
  shippingError: string;
  state: Fulfillment["state"];
  courierStatus: string;
  pickupRequestedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  emailed: boolean;
};

const isDelhivery = (o: ShopOrder) => (o.shippingPartner || "Delhivery").toLowerCase().includes("delhivery");

function row(order: ShopOrder, f?: Fulfillment): ShipRow {
  return {
    id: order.id,
    createdAt: order.createdAt,
    name: order.name,
    city: order.city || "",
    pincode: order.pincode || "",
    items: order.items.map((i) => `${i.qty}× ${i.name}${i.withFrame ? " (framed)" : ""}`).join(", "),
    total: order.total,
    awb: order.awb || "",
    partner: order.shippingPartner || "",
    shippingError: order.shippingError || "",
    state: f?.state ?? "ready",
    courierStatus: f?.courierStatus ?? "",
    pickupRequestedAt: f?.pickupRequestedAt,
    pickedUpAt: f?.pickedUpAt,
    deliveredAt: f?.deliveredAt,
    emailed: Boolean(f?.shippedEmailAt),
  };
}

export async function shipBoard(): Promise<{ toShip: ShipRow[]; onTheWay: ShipRow[]; done: ShipRow[] }> {
  const [orders, ful] = await Promise.all([listOrders(), listFulfillment()]);
  const paid = orders.filter((o) => o.status === "paid");
  const rows = paid.map((o) => row(o, ful.get(o.id)));
  const byOldest = (a: ShipRow, b: ShipRow) => a.createdAt.localeCompare(b.createdAt);
  return {
    toShip: rows.filter((r) => stillToShip(r.state)).sort(byOldest),
    onTheWay: rows.filter((r) => r.state === "picked_up").sort(byOldest),
    done: rows
      .filter((r) => r.state === "delivered" || r.state === "sent_other")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40),
  };
}

/** Make sure each chosen order has a Delhivery waybill (books any that failed earlier). */
export async function ensureWaybills(ids: string[]): Promise<ShopOrder[]> {
  const orders = await listOrders();
  const chosen = orders.filter((o) => ids.includes(o.id) && o.status === "paid");
  const out: ShopOrder[] = [];
  for (const order of chosen) out.push(order.awb ? order : await bookShipmentIfNeeded(order));
  return out;
}

export async function pickupFor(ids: string[]) {
  if (!ids.length) throw new Error("Pick at least one parcel.");
  if (!shippingConfigured()) throw new Error("Delhivery is not set up on Vercel.");
  const ready = (await ensureWaybills(ids)).filter((o) => o.awb);
  if (!ready.length) throw new Error("None of these orders have a Delhivery label yet.");
  const slot = await requestPickup(ready.length);
  const now = new Date().toISOString();
  for (const order of ready) await setFulfillment(order.id, { state: "pickup_requested", pickupRequestedAt: now });
  return { parcels: ready.length, ...slot };
}

/** Went out by local courier / by hand: drop from the list and free the Delhivery waybill. */
export async function markSentOther(ids: string[]) {
  const [orders, ful] = await Promise.all([listOrders(), listFulfillment()]);
  const chosen = orders.filter((o) => ids.includes(o.id));
  const cancel = chosen
    .filter((o) => o.awb && isDelhivery(o) && stillToShip(ful.get(o.id)?.state))
    .map((o) => o.awb as string);
  for (const order of chosen) await setFulfillment(order.id, { state: "sent_other", courierStatus: "Sent another way" });
  await cancelWaybills(cancel);
  return chosen.length;
}

/** Put an order back on the to-ship list (undo). */
export async function markReady(id: string) {
  await setFulfillment(id, { state: "ready", courierStatus: "" });
}

/**
 * Ask Delhivery about every parcel that is waiting or moving. First scan → order marked
 * shipped + customer emailed once. Delivered → marked delivered. Safe to call often.
 */
export async function syncTracking(): Promise<{ checked: number; shipped: number; delivered: number }> {
  if (!shippingConfigured()) return { checked: 0, shipped: 0, delivered: 0 };
  const [orders, ful] = await Promise.all([listOrders(), listFulfillment()]);
  const watch = orders.filter((o) => {
    const state = ful.get(o.id)?.state;
    return o.status === "paid" && o.awb && isDelhivery(o) && state !== "delivered" && state !== "sent_other";
  });
  const live = await trackWaybills(watch.map((o) => o.awb as string));
  let shipped = 0;
  let delivered = 0;
  for (const order of watch) {
    const info = live.get(order.awb as string);
    if (!info) continue;
    const f = ful.get(order.id);
    if (info.delivered && f?.state !== "delivered") {
      await setFulfillment(order.id, {
        state: "delivered",
        courierStatus: info.status,
        deliveredAt: new Date().toISOString(),
        pickedUpAt: f?.pickedUpAt ?? new Date().toISOString(),
      });
      delivered += 1;
    } else if (info.pickedUp && stillToShip(f?.state)) {
      const now = new Date().toISOString();
      const current = (await updateOrder(order.id, { shippedAt: now })) ?? order;
      let emailedAt: string | undefined;
      try {
        if (await emailShipped(current, trackingUrlFor("Delhivery", order.awb as string))) emailedAt = now;
      } catch (error) {
        console.error("shipped email", order.id, error);
      }
      await setFulfillment(order.id, {
        state: "picked_up",
        courierStatus: info.status,
        pickedUpAt: now,
        shippedEmailAt: emailedAt,
      });
      shipped += 1;
    } else if (info.status && info.status !== f?.courierStatus) {
      await setFulfillment(order.id, { courierStatus: info.status });
    }
  }
  return { checked: watch.length, shipped, delivered };
}
