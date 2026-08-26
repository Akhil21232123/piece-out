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

function normalizeOrder(row: ShopOrder): ShopOrder {
  return {
    ...row,
    status: row.status === "paid" || row.status === "failed" || row.status === "pending" ? row.status : "paid",
    utr: row.utr ?? "",
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
    phone: String(row.phone),
    address: String(row.address),
    total: Number(row.total),
    items: parseItems(row.items),
    utr: String(row.utr ?? ""),
    paymentId: row.payment_id ? String(row.payment_id) : undefined,
    razorpayOrderId: row.razorpay_order_id ? String(row.razorpay_order_id) : undefined,
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
  };
}

async function pgSave(order: ShopOrder) {
  const sql = sqlClient();
  if (!sql) return false;
  await ensureSchema(sql);
  await sql`
    INSERT INTO shop_orders (
      id, created_at, status, name, phone, address, total, items, utr,
      payment_id, razorpay_order_id, failure_reason
    )
    VALUES (
      ${order.id},
      ${order.createdAt},
      ${order.status},
      ${order.name},
      ${order.phone},
      ${order.address},
      ${order.total},
      ${JSON.stringify(order.items)}::jsonb,
      ${order.utr || null},
      ${order.paymentId ?? null},
      ${order.razorpayOrderId ?? null},
      ${order.failureReason ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      utr = EXCLUDED.utr,
      payment_id = EXCLUDED.payment_id,
      razorpay_order_id = EXCLUDED.razorpay_order_id,
      failure_reason = EXCLUDED.failure_reason
  `;
  return true;
}

async function mysqlSave(order: ShopOrder) {
  const db = mysqlPool();
  if (!db) return false;
  await ensureMysqlSchema(db);
  await db.query(
    `INSERT INTO shop_orders (
      id, created_at, status, name, phone, address, total, items, utr,
      payment_id, razorpay_order_id, failure_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      utr = VALUES(utr),
      payment_id = VALUES(payment_id),
      razorpay_order_id = VALUES(razorpay_order_id),
      failure_reason = VALUES(failure_reason)`,
    [
      order.id,
      new Date(order.createdAt),
      order.status,
      order.name,
      order.phone,
      order.address,
      order.total,
      JSON.stringify(order.items),
      order.utr || null,
      order.paymentId ?? null,
      order.razorpayOrderId ?? null,
      order.failureReason ?? null,
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

export async function saveOrder(order: ShopOrder) {
  upsertMemory(order);
  await upsertFile(order);
  await redisSave(order);
  await mysqlSave(order);
  await pgSave(order);
}

export async function getOrder(id: string): Promise<ShopOrder | null> {
  const fromMysql = await mysqlGet(id);
  if (fromMysql) return fromMysql;
  const fromPg = await pgGet(id);
  if (fromPg) return fromPg;
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

export async function getOrderByRazorpayId(razorpayOrderId: string): Promise<ShopOrder | null> {
  const fromMysql = await mysqlByRazorpay(razorpayOrderId);
  if (fromMysql) return fromMysql;
  const fromPg = await pgByRazorpay(razorpayOrderId);
  if (fromPg) return fromPg;
  const listed = await listOrders();
  return listed.find((row) => row.razorpayOrderId === razorpayOrderId) ?? null;
}

export async function updateOrder(id: string, patch: Partial<ShopOrder>): Promise<ShopOrder | null> {
  const current = await getOrder(id);
  if (!current) return null;
  if (current.status === "paid" && patch.status && patch.status !== "paid") {
    return current;
  }
  const next: ShopOrder = { ...current, ...patch, id: current.id };
  await saveOrder(next);
  return next;
}

export async function listOrders(): Promise<ShopOrder[]> {
  const fromMysql = await mysqlList();
  if (fromMysql && fromMysql.length) return fromMysql;
  const fromPg = await pgList();
  if (fromPg && fromPg.length) return fromPg;
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
    `Total ₹${order.total}`,
    "",
    `Name: ${order.name}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    order.paymentId ? `Payment: ${order.paymentId}` : "",
    order.utr ? `UTR: ${order.utr}` : "",
    order.failureReason ? `Failure: ${order.failureReason}` : "",
    `UPI: 7981590780@fam`,
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
      phone: order.phone,
      address: order.address,
      paymentId: order.paymentId ?? "",
      utr: order.utr,
      total: `₹${order.total}`,
      items: itemsText(order),
      paidTo: "7981590780@fam",
      placedAt: order.createdAt,
    }),
  });
  if (!res.ok) throw new Error(`Email send failed (${res.status})`);
}
