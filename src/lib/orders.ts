import { createHmac, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { ensureSchema, sqlClient } from "./db";
import { ensureMysqlSchema, mysqlPool } from "./mysql";
import type { OrderItem, OrderStatus, ShopOrder } from "./orderTypes";

export type { OrderItem, OrderStatus, ShopOrder } from "./orderTypes";

const TMP_FILE = path.join("/tmp", "piece-out-orders.json");
const LIST_KEY = "po-orders";
const ROW_KEY = "po-order:";

type GlobalOrders = typeof globalThis & { __pieceOutOrders?: ShopOrder[] };

function memory(): ShopOrder[] {
  const g = globalThis as GlobalOrders;
  if (!g.__pieceOutOrders) g.__pieceOutOrders = [];
  return g.__pieceOutOrders;
}

function redisAuth() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redis(command: unknown[]) {
  const auth = redisAuth();
  if (!auth) return null;
  const res = await fetch(`${auth.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify([command]),
  });
  if (!res.ok) return null;
  const payload: unknown = await res.json();
  const first = Array.isArray(payload) ? payload[0] : payload;
  if (first && typeof first === "object" && "result" in first) {
    return (first as { result: unknown }).result;
  }
  return first;
}

async function readFileStore(): Promise<ShopOrder[]> {
  try {
    const raw = await fs.readFile(TMP_FILE, "utf8");
    const parsed = JSON.parse(raw) as ShopOrder[];
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
  } catch {
    return [];
  }
}

async function writeFileStore(orders: ShopOrder[]) {
  await fs.writeFile(TMP_FILE, JSON.stringify(orders.slice(0, 400)), "utf8");
}

function optionalIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text && text !== "null" ? text : undefined;
}

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value);
  return text && text !== "null" ? text : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeOrder(row: ShopOrder): ShopOrder {
  return {
    ...row,
    email: row.email ?? "",
    status: row.status === "paid" || row.status === "failed" || row.status === "pending" ? row.status : "paid",
    utr: row.utr ?? "",
    capturedAt: row.capturedAt,
    settledAt: row.settledAt,
    settlementId: row.settlementId,
    settlementUtr: row.settlementUtr,
    verifiedAt: row.verifiedAt,
    paymentMethod: row.paymentMethod,
    paymentVpa: row.paymentVpa,
    razorpayAmountPaise: row.razorpayAmountPaise,
    pincode: row.pincode,
    city: row.city,
    state: row.state,
    subtotal: row.subtotal,
    gst: row.gst,
    shippingFee: row.shippingFee,
    shippingPartner: row.shippingPartner,
    awb: row.awb,
    shiprocketOrderId: row.shiprocketOrderId,
    shiprocketShipmentId: row.shiprocketShipmentId,
    trackingUrl: row.trackingUrl,
    shippedAt: row.shippedAt,
    shippingError: row.shippingError,
    shopifyOrderId: row.shopifyOrderId,
  };
}

function parseItems(value: unknown): OrderItem[] {
  if (Array.isArray(value)) return value as OrderItem[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as OrderItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function fromDb(row: Record<string, unknown>): ShopOrder {
  return {
    id: String(row.id),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(String(row.created_at)).toISOString(),
    status: row.status as OrderStatus,
    name: String(row.name),
    email: String(row.email ?? ""),
    phone: String(row.phone),
    address: String(row.address),
    total: Number(row.total),
    items: parseItems(row.items),
    utr: String(row.utr ?? ""),
    paymentId: optionalText(row.payment_id),
    razorpayOrderId: optionalText(row.razorpay_order_id),
    failureReason: optionalText(row.failure_reason),
    capturedAt: optionalIso(row.captured_at),
    settledAt: optionalIso(row.settled_at),
    settlementId: optionalText(row.settlement_id),
    settlementUtr: optionalText(row.settlement_utr),
    verifiedAt: optionalIso(row.verified_at),
    paymentMethod: optionalText(row.payment_method),
    paymentVpa: optionalText(row.payment_vpa),
    razorpayAmountPaise:
      row.razorpay_amount === null || row.razorpay_amount === undefined
        ? undefined
        : Number(row.razorpay_amount),
    pincode: optionalText(row.pincode),
    city: optionalText(row.city),
    state: optionalText(row.state),
    subtotal: optionalNumber(row.subtotal),
    gst: optionalNumber(row.gst),
    shippingFee: optionalNumber(row.shipping_fee),
    shippingPartner: optionalText(row.shipping_partner),
    awb: optionalText(row.awb),
    shiprocketOrderId: optionalText(row.shiprocket_order_id),
    shiprocketShipmentId: optionalText(row.shiprocket_shipment_id),
    trackingUrl: optionalText(row.tracking_url),
    shippedAt: optionalIso(row.shipped_at),
    shippingError: optionalText(row.shipping_error),
    shopifyOrderId: optionalText(row.shopify_order_id),
  };
}

async function pgSave(order: ShopOrder) {
  const sql = sqlClient();
  if (!sql) return false;
  await ensureSchema(sql);
  await sql`
    INSERT INTO shop_orders (
      id, created_at, status, name, email, phone, address, total, items, utr,
      payment_id, razorpay_order_id, failure_reason,
      captured_at, settled_at, settlement_id, settlement_utr,
      verified_at, payment_method, payment_vpa, razorpay_amount,
      subtotal, gst, shipping_fee, pincode, city, state,
      shipping_partner, awb, shiprocket_order_id, shiprocket_shipment_id,
      tracking_url, shipped_at, shipping_error, shopify_order_id
    )
    VALUES (
      ${order.id},
      ${order.createdAt},
      ${order.status},
      ${order.name},
      ${order.email},
      ${order.phone},
      ${order.address},
      ${order.total},
      ${JSON.stringify(order.items)}::jsonb,
      ${order.utr || null},
      ${order.paymentId ?? null},
      ${order.razorpayOrderId ?? null},
      ${order.failureReason ?? null},
      ${order.capturedAt ?? null},
      ${order.settledAt ?? null},
      ${order.settlementId ?? null},
      ${order.settlementUtr ?? null},
      ${order.verifiedAt ?? null},
      ${order.paymentMethod ?? null},
      ${order.paymentVpa ?? null},
      ${order.razorpayAmountPaise ?? null},
      ${order.subtotal ?? null},
      ${order.gst ?? null},
      ${order.shippingFee ?? null},
      ${order.pincode ?? null},
      ${order.city ?? null},
      ${order.state ?? null},
      ${order.shippingPartner ?? null},
      ${order.awb ?? null},
      ${order.shiprocketOrderId ?? null},
      ${order.shiprocketShipmentId ?? null},
      ${order.trackingUrl ?? null},
      ${order.shippedAt ?? null},
      ${order.shippingError ?? null},
      ${order.shopifyOrderId ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      total = EXCLUDED.total,
      items = EXCLUDED.items,
      utr = EXCLUDED.utr,
      payment_id = EXCLUDED.payment_id,
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      failure_reason = EXCLUDED.failure_reason,
      captured_at = EXCLUDED.captured_at,
      settled_at = EXCLUDED.settled_at,
      settlement_id = EXCLUDED.settlement_id,
      settlement_utr = EXCLUDED.settlement_utr,
      verified_at = EXCLUDED.verified_at,
      payment_method = EXCLUDED.payment_method,
      payment_vpa = EXCLUDED.payment_vpa,
      razorpay_amount = EXCLUDED.razorpay_amount,
      subtotal = EXCLUDED.subtotal,
      gst = EXCLUDED.gst,
      shipping_fee = EXCLUDED.shipping_fee,
      pincode = EXCLUDED.pincode,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      shipping_partner = EXCLUDED.shipping_partner,
      awb = EXCLUDED.awb,
      shiprocket_order_id = EXCLUDED.shiprocket_order_id,
      shiprocket_shipment_id = EXCLUDED.shiprocket_shipment_id,
      tracking_url = EXCLUDED.tracking_url,
      shipped_at = EXCLUDED.shipped_at,
      shipping_error = EXCLUDED.shipping_error,
      shopify_order_id = EXCLUDED.shopify_order_id
  `;
  return true;
}

async function mysqlSave(order: ShopOrder) {
  const db = mysqlPool();
  if (!db) return false;
  await ensureMysqlSchema(db);
  await db.query(
    `INSERT INTO shop_orders (
      id, created_at, status, name, email, phone, address, total, items, utr,
      payment_id, razorpay_order_id, failure_reason,
      captured_at, settled_at, settlement_id, settlement_utr,
      verified_at, payment_method, payment_vpa, razorpay_amount,
      subtotal, gst, shipping_fee, pincode, city, state,
      shipping_partner, awb, shiprocket_order_id, shiprocket_shipment_id,
      tracking_url, shipped_at, shipping_error, shopify_order_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      name = VALUES(name),
      email = VALUES(email),
      phone = VALUES(phone),
      address = VALUES(address),
      total = VALUES(total),
      items = VALUES(items),
      utr = VALUES(utr),
      payment_id = VALUES(payment_id),
      razorpay_order_id = VALUES(razorpay_order_id),
      failure_reason = VALUES(failure_reason),
      captured_at = VALUES(captured_at),
      settled_at = VALUES(settled_at),
      settlement_id = VALUES(settlement_id),
      settlement_utr = VALUES(settlement_utr),
      verified_at = VALUES(verified_at),
      payment_method = VALUES(payment_method),
      payment_vpa = VALUES(payment_vpa),
      razorpay_amount = VALUES(razorpay_amount),
      subtotal = VALUES(subtotal),
      gst = VALUES(gst),
      shipping_fee = VALUES(shipping_fee),
      pincode = VALUES(pincode),
      city = VALUES(city),
      state = VALUES(state),
      shipping_partner = VALUES(shipping_partner),
      awb = VALUES(awb),
      shiprocket_order_id = VALUES(shiprocket_order_id),
      shiprocket_shipment_id = VALUES(shiprocket_shipment_id),
      tracking_url = VALUES(tracking_url),
      shipped_at = VALUES(shipped_at),
      shipping_error = VALUES(shipping_error),
      shopify_order_id = VALUES(shopify_order_id)`,
    [
      order.id,
      new Date(order.createdAt),
      order.status,
      order.name,
      order.email,
      order.phone,
      order.address,
      order.total,
      JSON.stringify(order.items),
      order.utr || null,
      order.paymentId ?? null,
      order.razorpayOrderId ?? null,
      order.failureReason ?? null,
      order.capturedAt ? new Date(order.capturedAt) : null,
      order.settledAt ? new Date(order.settledAt) : null,
      order.settlementId ?? null,
      order.settlementUtr ?? null,
      order.verifiedAt ? new Date(order.verifiedAt) : null,
      order.paymentMethod ?? null,
      order.paymentVpa ?? null,
      order.razorpayAmountPaise ?? null,
      order.subtotal ?? null,
      order.gst ?? null,
      order.shippingFee ?? null,
      order.pincode ?? null,
      order.city ?? null,
      order.state ?? null,
      order.shippingPartner ?? null,
      order.awb ?? null,
      order.shiprocketOrderId ?? null,
      order.shiprocketShipmentId ?? null,
      order.trackingUrl ?? null,
      order.shippedAt ? new Date(order.shippedAt) : null,
      order.shippingError ?? null,
      order.shopifyOrderId ?? null,
    ],
  );
  return true;
}

async function mysqlGet(id: string): Promise<ShopOrder | null> {
  const db = mysqlPool();
  if (!db) return null;
  await ensureMysqlSchema(db);
  const [rows] = await db.query("SELECT * FROM shop_orders WHERE id = ? LIMIT 1", [id]);
  const list = rows as Record<string, unknown>[];
  return list[0] ? fromDb(list[0]) : null;
}

async function mysqlByRazorpay(razorpayOrderId: string): Promise<ShopOrder | null> {
  const db = mysqlPool();
  if (!db) return null;
  await ensureMysqlSchema(db);
  const [rows] = await db.query("SELECT * FROM shop_orders WHERE razorpay_order_id = ? LIMIT 1", [
    razorpayOrderId,
  ]);
  const list = rows as Record<string, unknown>[];
  return list[0] ? fromDb(list[0]) : null;
}

async function mysqlList(): Promise<ShopOrder[] | null> {
  const db = mysqlPool();
  if (!db) return null;
  await ensureMysqlSchema(db);
  const [rows] = await db.query("SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT 400");
  return (rows as Record<string, unknown>[]).map(fromDb);
}

async function pgGet(id: string): Promise<ShopOrder | null> {
  const sql = sqlClient();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = (await sql`SELECT * FROM shop_orders WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  return rows[0] ? fromDb(rows[0]) : null;
}

async function pgByRazorpay(razorpayOrderId: string): Promise<ShopOrder | null> {
  const sql = sqlClient();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = (await sql`SELECT * FROM shop_orders WHERE razorpay_order_id = ${razorpayOrderId} LIMIT 1`) as Record<
    string,
    unknown
  >[];
  return rows[0] ? fromDb(rows[0]) : null;
}

async function pgList(): Promise<ShopOrder[] | null> {
  const sql = sqlClient();
  if (!sql) return null;
  await ensureSchema(sql);
  const rows = (await sql`SELECT * FROM shop_orders ORDER BY created_at DESC LIMIT 400`) as Record<string, unknown>[];
  return rows.map(fromDb);
}

function upsertMemory(order: ShopOrder) {
  const list = memory();
  const idx = list.findIndex((row) => row.id === order.id);
  if (idx >= 0) list[idx] = order;
  else list.unshift(order);
  list.splice(400);
}

async function upsertFile(order: ShopOrder) {
  const fromFile = await readFileStore();
  const next = [order, ...fromFile.filter((row) => row.id !== order.id)].slice(0, 400);
  await writeFileStore(next);
}

async function redisSave(order: ShopOrder) {
  await redis(["SET", `${ROW_KEY}${order.id}`, JSON.stringify(order)]);
  await redis(["LPUSH", LIST_KEY, JSON.stringify(order)]);
  await redis(["LTRIM", LIST_KEY, 0, 399]);
}

export function durableStoreConfigured(): boolean {
  return Boolean(sqlClient() || mysqlPool());
}

export async function saveOrder(order: ShopOrder) {
  upsertMemory(order);
  await upsertFile(order);
  await redisSave(order);
  await mysqlSave(order);
  await pgSave(order);
}

export async function getOrder(id: string): Promise<ShopOrder | null> {
  const fromPg = await pgGet(id);
  if (fromPg) return fromPg;
  const fromMysql = await mysqlGet(id);
  if (fromMysql) return fromMysql;
  const raw = await redis(["GET", `${ROW_KEY}${id}`]);
  if (typeof raw === "string") {
    try {
      return normalizeOrder(JSON.parse(raw) as ShopOrder);
    } catch {
      /* continue */
    }
  }
  const mem = memory().find((row) => row.id === id);
  if (mem) return mem;
  return (await readFileStore()).find((row) => row.id === id) ?? null;
}

export async function getOrderByPaymentId(paymentId: string): Promise<ShopOrder | null> {
  if (!paymentId) return null;
  const listed = await listOrders();
  return listed.find((row) => row.paymentId === paymentId) ?? null;
}

export async function getOrderByRazorpayId(razorpayOrderId: string): Promise<ShopOrder | null> {
  const fromPg = await pgByRazorpay(razorpayOrderId);
  if (fromPg) return fromPg;
  const fromMysql = await mysqlByRazorpay(razorpayOrderId);
  if (fromMysql) return fromMysql;
  const listed = await listOrders();
  return listed.find((row) => row.razorpayOrderId === razorpayOrderId) ?? null;
}

export async function updateOrder(id: string, patch: Partial<ShopOrder>): Promise<ShopOrder | null> {
  const current = await getOrder(id);
  if (!current) return null;
  if (current.status === "paid" && patch.status && patch.status !== "paid") {
    return current;
  }
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<ShopOrder>;
  const next: ShopOrder = { ...current, ...cleaned, id: current.id };
  await saveOrder(next);
  return next;
}

export async function listOrders(): Promise<ShopOrder[]> {
  if (sqlClient()) {
    const fromPg = await pgList();
    if (fromPg) return fromPg;
  }
  const fromMysql = await mysqlList();
  if (fromMysql && fromMysql.length) return fromMysql;
  const auth = redisAuth();
  if (auth) {
    const rows = await redis(["LRANGE", LIST_KEY, 0, 399]);
    if (Array.isArray(rows) && rows.length) {
      const parsed = rows
        .map((row) => {
          if (typeof row !== "string") return null;
          try {
            return normalizeOrder(JSON.parse(row) as ShopOrder);
          } catch {
            return null;
          }
        })
        .filter((row): row is ShopOrder => Boolean(row));
      const unique = new Map<string, ShopOrder>();
      for (const row of parsed) unique.set(row.id, row);
      return [...unique.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }
  const fromFile = await readFileStore();
  if (fromFile.length) return fromFile;
  return memory();
}

export function adminPassword(): string {
  return process.env.ORDERS_PASSWORD ?? "";
}

export function inboxEmail(): string {
  return process.env.ORDER_EMAIL ?? "";
}

export function passwordMatches(input: string): boolean {
  const expected = adminPassword();
  if (!expected || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminCookieValue(): string {
  const secret = adminPassword();
  if (!secret) return "";
  return createHmac("sha256", secret).update("po-admin-v1").digest("hex");
}

export function cookieMatches(value: string): boolean {
  const expected = adminCookieValue();
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function itemsText(order: ShopOrder): string {
  return order.items
    .map(
      (item) =>
        `${item.qty}× ${item.name} (${item.withFrame ? "framed" : "no frame"}) · ₹${item.unitPrice}`,
    )
    .join("\n");
}

export async function emailOrder(order: ShopOrder) {
  const to = inboxEmail();
  if (!to) return;

  const body = [
    `Order ${order.id}`,
    `Status: ${order.status}`,
    order.createdAt,
    "",
    itemsText(order),
    order.subtotal != null ? `Subtotal ₹${order.subtotal}` : "",
    order.gst != null ? `GST ₹${order.gst}` : "",
    order.shippingFee != null ? `Delhivery ₹${order.shippingFee}` : "",
    `Total ₹${order.total}`,
    "",
    `Name: ${order.name}`,
    `Email: ${order.email || "—"}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    order.pincode ? `PIN ${order.pincode}${order.city ? ` · ${order.city}` : ""}${order.state ? `, ${order.state}` : ""}` : "",
    order.awb
      ? `Ship ${order.shippingPartner || "Courier"} · AWB ${order.awb}${order.trackingUrl ? ` · ${order.trackingUrl}` : ""}`
      : order.shippingError
        ? `Shipping: ${order.shippingError}`
        : "Shipping: hand to courier after pack",
    order.paymentId ? `Razorpay payment: ${order.paymentId}` : "",
    order.verifiedAt ? `Razorpay verified: ${order.verifiedAt}` : "",
    order.paymentMethod ? `Method: ${order.paymentMethod}${order.paymentVpa ? ` ${order.paymentVpa}` : ""}` : "",
    order.settlementUtr
      ? `In bank · UTR ${order.settlementUtr}`
      : order.status === "paid"
        ? "In Razorpay · not settled to bank yet"
        : "",
    order.utr ? `Customer UTR: ${order.utr}` : "",
    order.failureReason ? `Failure: ${order.failureReason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "piece/out <orders@resend.dev>",
        to: [to],
        subject: `piece/out ${order.id} · ${order.status} · ₹${order.total}`,
        text: body,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed (${res.status})`);
    return;
  }

  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "piece-out-orders",
    },
    body: JSON.stringify({
      _subject: `piece/out ${order.id} · ${order.status} · ₹${order.total}`,
      _template: "box",
      _captcha: "false",
      orderId: order.id,
      status: order.status,
      name: order.name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      paymentId: order.paymentId ?? "",
      capturedAt: order.capturedAt ?? "",
      settlementUtr: order.settlementUtr ?? "",
      money: order.settlementUtr
        ? `in bank ${order.settlementUtr}`
        : order.status === "paid"
          ? "in razorpay, not in bank yet"
          : order.status,
      total: `₹${order.total}`,
      items: itemsText(order),
      placedAt: order.createdAt,
    }),
  });
  if (!res.ok) throw new Error(`Email send failed (${res.status})`);
}
