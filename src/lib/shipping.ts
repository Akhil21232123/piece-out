import { parcelWeightG } from "./brand";
import type { OrderItem, ShopOrder } from "./orderTypes";
import { getOrder, updateOrder } from "./orders";
import { lookupPincode } from "./pincode";

/** Live Delhivery Express API. Override with DELHIVERY_BASE_URL for staging. */
function baseUrl(): string {
  return (
    process.env.DELHIVERY_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://track.delhivery.com"
  );
}

export const COURIERS = [
  { id: "delhivery", label: "Delhivery" },
  { id: "dtdc", label: "DTDC" },
  { id: "bluedart", label: "Blue Dart" },
  { id: "indiapost", label: "India Post" },
  { id: "other", label: "Other" },
] as const;

export type CourierId = (typeof COURIERS)[number]["id"];

const IN_STATE: Record<string, string> = {
  AN: "Andaman and Nicobar Islands",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CT: "Chhattisgarh",
  DN: "Dadra and Nagar Haveli and Daman and Diu",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OR: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TG: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UT: "Uttarakhand",
  WB: "West Bengal",
};

export function shippingConfigured(): boolean {
  return Boolean(process.env.DELHIVERY_API_TOKEN?.trim() && process.env.DELHIVERY_PICKUP?.trim());
}

function token(): string {
  return process.env.DELHIVERY_API_TOKEN?.trim() ?? "";
}

function pickupName(): string {
  return process.env.DELHIVERY_PICKUP?.trim() || "MESA BANGALORE";
}

function clientName(): string {
  return process.env.DELHIVERY_CLIENT?.trim() || "";
}

function mesaPin(): string {
  return process.env.DELHIVERY_RETURN_PIN?.trim() || "560076";
}

function mesaCity(): string {
  return process.env.DELHIVERY_RETURN_CITY?.trim() || "Bangalore";
}

function mesaState(): string {
  return process.env.DELHIVERY_RETURN_STATE?.trim() || "Karnataka";
}

function mesaPhone(): string {
  return process.env.DELHIVERY_RETURN_PHONE?.trim() || "";
}

function mesaAddress(): string {
  return (
    process.env.DELHIVERY_RETURN_ADD?.trim() ||
    "Mesa School of Business, WeWork Salarpuria Symbiosis, Bannerghatta Road, Begur Hobli, Bengaluru"
  );
}

function flagYes(value: unknown): boolean {
  const raw = String(value ?? "").trim().toUpperCase();
  return raw === "Y" || raw === "YES" || raw === "1" || raw === "TRUE";
}

function authHeaders(json = false): HeadersInit {
  return {
    Authorization: `Token ${token()}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function dlvFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8000, ...rest } = init;
  return fetch(`${baseUrl()}${path}`, {
    ...rest,
    cache: "no-store",
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

export async function delhiveryServiceable(pin: string): Promise<{
  ok: boolean;
  city?: string;
  state?: string;
  reason?: string;
}> {
  if (!token()) return { ok: true };
  try {
    const res = await dlvFetch(`/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin)}`, {
      headers: authHeaders(),
      timeoutMs: 4000,
    });
    const data = (await res.json().catch(() => ({}))) as {
      delivery_codes?: Array<{
        postal_code?: {
          pin?: string;
          prepaid?: string | number;
          pre_paid?: string | number;
          city?: string;
          state?: string;
          state_code?: string;
          district?: string;
        };
      }>;
    };
    const postal = data.delivery_codes?.[0]?.postal_code;
    if (!res.ok || !postal) {
      return { ok: false, reason: "Delhivery does not deliver to this pincode." };
    }
    const prepaid = postal.prepaid ?? postal.pre_paid;
    const city = postal.city || postal.district;
    const state = postal.state || IN_STATE[String(postal.state_code ?? "").toUpperCase()] || "";
    if (!flagYes(prepaid)) {
      return {
        ok: false,
        city,
        state,
        reason: "Delhivery prepaid is not open for this pincode.",
      };
    }
    return { ok: true, city, state };
  } catch {
    return { ok: true };
  }
}

export async function resolveShipTo(pin: string): Promise<{
  ok: boolean;
  city: string;
  state: string;
  locality: string;
  reason: string;
}> {
  const place = await lookupPincode(pin);
  let city = place?.city ?? "";
  let state = place?.state ?? "";
  const locality = place?.locality ?? "";
  let reason = place?.reason ?? "";
  let ok = Boolean(city && state && place?.serviceable !== false);

  if (token()) {
    const zone = await delhiveryServiceable(pin);
    if (zone.city) city = zone.city;
    if (zone.state) state = zone.state;
    if (shippingConfigured()) {
      ok = zone.ok && Boolean(city && state);
      reason = zone.ok ? "" : zone.reason || reason;
    } else {
      ok = Boolean(city && state);
    }
  }

  return {
    ok,
    city,
    state,
    locality,
    reason: ok ? "" : reason || "Enter a valid Indian pincode.",
  };
}

const quoteCache = new Map<string, { fee: number; at: number }>();

export async function quoteDelhiveryCharge(pin: string, weightG: number): Promise<number> {
  const grams = Math.max(100, Math.round(weightG));
  const key = `${pin}:${grams}`;
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.fee;

  const fallback = grams >= 800 ? 81 : 60;
  if (!token()) {
    quoteCache.set(key, { fee: fallback, at: Date.now() });
    return fallback;
  }
  try {
    const query = new URLSearchParams({
      md: "S",
      cgm: String(grams),
      o_pin: mesaPin(),
      d_pin: pin,
      ss: "Delivered",
    });
    const res = await dlvFetch(`/api/kinko/v1/invoice/charges/.json?${query}`, {
      headers: authHeaders(),
      timeoutMs: 4000,
    });
    const data = (await res.json().catch(() => null)) as Array<{ total_amount?: number }> | null;
    const raw = Number(data?.[0]?.total_amount);
    const fee = Number.isFinite(raw) && raw > 0 ? Math.ceil(raw) : fallback;
    quoteCache.set(key, { fee, at: Date.now() });
    return fee;
  } catch {
    quoteCache.set(key, { fee: fallback, at: Date.now() });
    return fallback;
  }
}

async function fetchWaybill(): Promise<string> {
  const client = clientName();
  const query = new URLSearchParams({ count: "1" });
  if (client) query.set("cl", client);
  const res = await dlvFetch(`/waybill/api/bulk/json/?${query}`, {
    headers: authHeaders(),
    timeoutMs: 5000,
  });
  const data = (await res.json().catch(() => null)) as unknown;
  if (typeof data === "string" && data.trim().length >= 8) return data.trim();
  if (data && typeof data === "object") {
    const row = data as { waybills?: string[]; waybill?: string };
    const first = row.waybills?.[0] || row.waybill;
    if (first && first.trim().length >= 8) return first.trim();
  }
  return "";
}

async function fetchWaybillByOrder(orderId: string): Promise<string> {
  const res = await dlvFetch(`/api/v1/packages/json/?ref_ids=${encodeURIComponent(orderId)}`, {
    headers: authHeaders(),
    timeoutMs: 5000,
  });
  const data = (await res.json().catch(() => ({}))) as {
    ShipmentData?: Array<{ Shipment?: { AWB?: string; Waybill?: string } }>;
  };
  const shipment = data.ShipmentData?.[0]?.Shipment;
  const awb = shipment?.AWB || shipment?.Waybill || "";
  return awb.trim();
}

function parcel(items: OrderItem[]) {
  const qty = Math.max(1, items.reduce((sum, item) => sum + item.qty, 0));
  const framed = items.some((item) => item.withFrame);
  return {
    weightG: parcelWeightG(items),
    length: framed ? 32 : 18,
    breadth: framed ? 32 : 12,
    height: framed ? 6 : qty > 1 ? 16 : 12,
  };
}

export function trackingUrlFor(partner: string, awb: string): string {
  const code = awb.replace(/\s+/g, "");
  const key = partner.trim().toLowerCase();
  if (!code) return "";
  if (key.includes("dtdc")) {
    return `https://www.dtdc.com/tracking?trackType=awb&refNo=${encodeURIComponent(code)}`;
  }
  if (key.includes("blue")) {
    return `https://www.bluedart.com/tracking/${encodeURIComponent(code)}`;
  }
  if (key.includes("india post") || key.includes("indiapost") || key.includes("speed post")) {
    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }
  return `https://www.delhivery.com/track/package/${encodeURIComponent(code)}`;
}

export function resolveCourier(label?: string): string {
  const raw = (label ?? "").trim();
  if (!raw) return "Delhivery";
  const hit = COURIERS.find(
    (c) => c.id === raw.toLowerCase() || c.label.toLowerCase() === raw.toLowerCase(),
  );
  return hit?.label ?? raw;
}

export function shippingPatch(order: Partial<ShopOrder> & { awb?: string }): Partial<ShopOrder> {
  const awb = order.awb?.trim().replace(/\s+/g, "").toUpperCase() || "";
  const partner = resolveCourier(order.shippingPartner);
  return {
    shippingPartner: partner,
    awb,
    trackingUrl: awb
      ? trackingUrlFor(partner, awb) || order.trackingUrl || ""
      : order.trackingUrl || "",
    shippedAt: order.shippedAt || (awb ? new Date().toISOString() : undefined),
    shiprocketOrderId: order.shiprocketOrderId,
    shiprocketShipmentId: order.shiprocketShipmentId,
    shippingError: order.shippingError ?? "",
  };
}

function consigneeAdd(order: ShopOrder): string {
  const street = order.address.replace(/\s+/g, " ").trim();
  const city = (order.city ?? "").trim();
  const tail = [city, order.state, order.pincode].filter(Boolean).join(", ");
  const alreadyHasCity = city && street.toLowerCase().includes(city.toLowerCase());
  const full = tail && !alreadyHasCity ? `${street}, ${tail}` : street;
  return full.slice(0, 190);
}

function createPayload(order: ShopOrder, waybill = "") {
  const box = parcel(order.items);
  const desc = order.items
    .map((item) => `${item.qty}x ${item.name}${item.withFrame ? " framed" : ""}`)
    .join(", ")
    .slice(0, 180);
  const qty = Math.max(
    1,
    order.items.reduce((sum, item) => sum + item.qty, 0),
  );
  const created = new Date(order.createdAt);
  const orderDate = Number.isNaN(created.getTime())
    ? order.createdAt.slice(0, 10)
    : created.toISOString().slice(0, 19).replace("T", " ");
  const shipment: Record<string, string | number> = {
    name: order.name.slice(0, 80),
    add: consigneeAdd(order),
    pin: Number(order.pincode),
    city: order.city || "",
    state: order.state || "",
    country: "India",
    phone: order.phone,
    email: order.email,
    order: order.id,
    payment_mode: "Prepaid",
    products_desc: desc || "pieceout puzzle",
    hsn_code: "9503",
    seller_name: "pieceout",
    seller_add: mesaAddress(),
    seller_inv: order.id,
    cod_amount: 0,
    order_date: orderDate,
    total_amount: order.total,
    quantity: qty,
    weight: box.weightG,
    shipment_length: box.length,
    shipment_width: box.breadth,
    shipment_height: box.height,
    shipping_mode: "Surface",
    address_type: "home",
    return_pin: mesaPin(),
    return_city: mesaCity(),
    return_state: mesaState(),
    return_phone: mesaPhone() || order.phone,
    return_add: mesaAddress(),
    return_name: process.env.DELHIVERY_RETURN_NAME?.trim() || "pieceout",
    return_country: "India",
  };
  if (waybill) shipment.waybill = waybill;

  const pickup_location: Record<string, string> = {
    name: pickupName(),
    city: mesaCity(),
    pin: mesaPin(),
    country: "India",
    add: mesaAddress(),
  };
  if (mesaPhone()) pickup_location.phone = mesaPhone();

  const payload: Record<string, unknown> = {
    shipments: [shipment],
    pickup_location,
  };
  const client = clientName();
  if (client) payload.client = client;
  return payload;
}

function nextPickupSlot() {
  const tz = "Asia/Kolkata";
  const cursor = new Date();
  for (let i = 0; i < 8; i += 1) {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(cursor);
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(cursor),
    );
    const closed = weekday === "Sun" || (i === 0 && hour >= 16);
    if (!closed) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(cursor);
      const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
      return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        time: i === 0 ? "17:00:00" : "11:00:00",
      };
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { date: new Date().toISOString().slice(0, 10), time: "11:00:00" };
}

async function requestPickup(): Promise<void> {
  const slot = nextPickupSlot();
  const res = await dlvFetch("/fm/request/new/", {
    method: "POST",
    headers: authHeaders(true),
    timeoutMs: 6000,
    body: JSON.stringify({
      pickup_time: slot.time,
      pickup_date: slot.date,
      pickup_location: pickupName(),
      expected_package_count: 1,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      prepaid?: string;
      pickup_location?: string;
    };
    throw new Error(
      data.error || data.prepaid || data.pickup_location || `Pickup request failed (${res.status})`,
    );
  }
}

export async function saveTracking(
  id: string,
  awb: string,
  partner?: string,
): Promise<ShopOrder | null> {
  const clean = awb.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 8) throw new Error("Enter a valid AWB / tracking id.");
  return updateOrder(
    id,
    shippingPatch({
      awb: clean,
      shippingPartner: partner || "Delhivery",
      shippingError: "",
    }),
  );
}

export function packingMessage(order: ShopOrder): string {
  const items = order.items
    .map((item) => `${item.qty}× ${item.name}${item.withFrame ? " (framed)" : ""}`)
    .join(", ");
  return [
    `pieceout ${order.id} · READY TO SHIP`,
    `${order.name} · ${order.phone}`,
    order.address,
    [order.city, order.state, order.pincode].filter(Boolean).join(", "),
    items,
    `Paid ₹${order.total}`,
  ].join("\n");
}

async function persistAwb(order: ShopOrder, awb: string, refnum?: string): Promise<ShopOrder> {
  const next = await updateOrder(
    order.id,
    shippingPatch({
      awb,
      shippingPartner: "Delhivery",
      shiprocketOrderId: refnum || order.id,
      shiprocketShipmentId: awb,
      trackingUrl: trackingUrlFor("Delhivery", awb),
      shippingError: "",
    }),
  );
  await requestPickup().catch(() => undefined);
  return next ?? { ...order, awb };
}

export async function bookShipment(order: ShopOrder): Promise<ShopOrder> {
  const fresh = (await getOrder(order.id)) ?? order;
  if (fresh.status !== "paid") {
    throw new Error("Pay has to clear before Delhivery can pick up.");
  }
  if (fresh.awb) return fresh;
  if (!fresh.pincode) {
    throw new Error("This order has no pincode, so Delhivery cannot book.");
  }
  if (!fresh.city || !fresh.state) {
    throw new Error("This order is missing city or state, so Delhivery cannot book.");
  }
  if (!shippingConfigured()) {
    throw new Error(
      "Add DELHIVERY_API_TOKEN and DELHIVERY_PICKUP on Vercel (pickup name must match Delhivery One exactly).",
    );
  }

  const waybill = await fetchWaybill().catch(() => "");
  const body = new URLSearchParams();
  body.set("format", "json");
  body.set("data", JSON.stringify(createPayload(fresh, waybill)));

  const res = await dlvFetch("/api/cmu/create.json", {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeoutMs: 12000,
    body,
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    rmk?: string;
    packages?: Array<{
      status?: string;
      waybill?: string;
      refnum?: string;
      remarks?: string[] | string;
      sort_code?: string;
    }>;
    error?: boolean | string;
    message?: string;
  };

  const pkg = data.packages?.[0];
  let awb = pkg?.waybill?.trim() || "";
  const remarks = Array.isArray(pkg?.remarks)
    ? pkg.remarks.filter(Boolean).join(" ")
    : typeof pkg?.remarks === "string"
      ? pkg.remarks
      : "";

  if (!awb && /duplicate/i.test(`${remarks} ${data.rmk ?? ""} ${data.message ?? ""}`)) {
    awb = await fetchWaybillByOrder(fresh.id).catch(() => "");
  }

  if (!res.ok && !awb) {
    throw new Error(data.message || data.rmk || `Delhivery create failed (${res.status})`);
  }

  if (!awb) {
    throw new Error(
      remarks ||
        data.rmk ||
        data.message ||
        "Delhivery did not return a waybill. Check pickup name and pincode.",
    );
  }

  return persistAwb(fresh, awb, pkg?.refnum);
}

export async function bookShipmentIfNeeded(order: ShopOrder): Promise<ShopOrder> {
  const fresh = (await getOrder(order.id)) ?? order;
  if (fresh.status !== "paid" || fresh.awb) return fresh;
  if (!shippingConfigured()) return fresh;
  try {
    return await bookShipment(fresh);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not book Delhivery.";
    const next = await updateOrder(fresh.id, {
      shippingError: message,
      shippingPartner: "Delhivery",
    });
    return next ?? fresh;
  }
}

export async function bookShipmentById(id: string): Promise<ShopOrder> {
  const order = await getOrder(id);
  if (!order) throw new Error("Order not found.");
  return bookShipment(order);
}

export async function retryUnshipped(orders: ShopOrder[]): Promise<number> {
  if (!shippingConfigured()) return 0;
  let booked = 0;
  const due = orders.filter((order) => order.status === "paid" && !order.awb).slice(0, 20);
  for (const order of due) {
    const next = await bookShipmentIfNeeded(order);
    if (next.awb) booked += 1;
  }
  return booked;
}
