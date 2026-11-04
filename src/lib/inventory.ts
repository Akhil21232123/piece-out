import { sqlClient } from "./db";
import { mysqlPool } from "./mysql";
import type { ShopOrder } from "./orderTypes";

/**
 * Hidden stock counts. Server-only: never sent to the browser. The site only ever learns
 * "sold out" (count ≤ 0), never the number.
 *
 * The repo is public, so counts are NOT in code. Starting counts come from the private
 * Vercel env var INVENTORY_SEED (JSON: product id → count, e.g. {"po-xx": 12}) the first time the
 * table is created, or are typed into /admin → stock. After that, each paid order captured
 * after INVENTORY_BASELINE subtracts its cans once.
 */

/** Orders paid before this were already taken off the starting counts by hand (export at 11:14 am IST, 4 Nov 2026). */
export const INVENTORY_BASELINE = "2026-11-04T05:44:00.000Z";

/** Cans we track (names as Ruthwik counts them). No numbers here — see INVENTORY_SEED env. */
export const INVENTORY_NAMES: Record<string, string> = {
  "po-17": "Fuji Garden",
  "po-21": "Disco Cheetah",
  "po-22": "Tokyo Summer",
  "po-23": "City Views (New York)",
  "po-24": "Dirty Martini",
  "po-01": "Diet Coke",
  "po-10": "Caprese Break",
  "po-11": "Lily Bloom",
  "po-12": "Vino Hours",
  "po-09": "Expensive Shit",
  "po-25": "Virat Kohli",
  "po-13": "Starboy",
  "po-08": "Fight Club",
  "po-26": "Spider-Man",
  "po-19": "Golden Hour (Neymar)",
  "po-18": "Stadium Dreams (Bellingham)",
  "po-20": "Billie Blue",
  "po-27": "Absolut",
};

function seedFromEnv(): Map<string, number> {
  const out = new Map<string, number>();
  const raw = process.env.INVENTORY_SEED?.trim();
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [productId, value] of Object.entries(parsed)) {
      const qty = Number(value);
      if (INVENTORY_NAMES[productId] && Number.isFinite(qty) && qty >= 0) out.set(productId, Math.round(qty));
    }
  } catch (error) {
    console.error("INVENTORY_SEED is not valid JSON", error);
  }
  return out;
}

/** Email Ruthwik when a can drops to this many (and again at 0). */
export const LOW_STOCK_AT = 3;

export type StockRow = { productId: string; name: string; qty: number; updatedAt: string };
/** Admin view: every tracked can, with qty null when no count has been set yet. */
export type StockView = { productId: string; name: string; qty: number | null; updatedAt: string };

const g = globalThis as unknown as { __poStock?: Map<string, StockRow>; __poStockMoves?: Set<string> };
function memStock(): Map<string, StockRow> {
  if (!g.__poStock) {
    g.__poStock = new Map(
      [...seedFromEnv()].map(([productId, qty]) => [
        productId,
        { productId, name: INVENTORY_NAMES[productId], qty, updatedAt: new Date().toISOString() },
      ]),
    );
  }
  return g.__poStock;
}
function memMoves(): Set<string> {
  if (!g.__poStockMoves) g.__poStockMoves = new Set();
  return g.__poStockMoves;
}

let pgReady = false;
let myReady = false;

async function pg() {
  const sql = sqlClient();
  if (!sql) return null;
  if (!pgReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        product_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_moves (
        order_id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        detail TEXT NOT NULL DEFAULT ''
      )
    `;
    for (const [productId, qty] of seedFromEnv()) {
      await sql`
        INSERT INTO inventory (product_id, name, qty) VALUES (${productId}, ${INVENTORY_NAMES[productId]}, ${qty})
        ON CONFLICT (product_id) DO NOTHING
      `;
    }
    pgReady = true;
  }
  return sql;
}

async function my() {
  const db = mysqlPool();
  if (!db) return null;
  if (!myReady) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        product_id VARCHAR(40) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        qty INT NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_moves (
        order_id VARCHAR(40) PRIMARY KEY,
        created_at DATETIME NOT NULL,
        detail TEXT
      )
    `);
    for (const [productId, qty] of seedFromEnv()) {
      await db.query("INSERT IGNORE INTO inventory (product_id, name, qty, updated_at) VALUES (?, ?, ?, NOW())", [
        productId,
        INVENTORY_NAMES[productId],
        qty,
      ]);
    }
    myReady = true;
  }
  return db;
}

let cache: { at: number; rows: StockRow[] } | null = null;
const CACHE_MS = 8_000;
let caughtUp = false;

/**
 * Once per server instance: take stock for any paid order since the baseline that wasn't
 * counted yet (orders paid before this code was live, or a failed paid hook). Idempotent.
 */
async function catchUp() {
  const { listOrders } = await import("./orders");
  const orders = await listOrders();
  for (const order of orders) {
    if (order.status === "paid" && paidAt(order) >= INVENTORY_BASELINE) {
      await applyPaidOrder(order);
    }
  }
}

export async function listStock(fresh = false): Promise<StockRow[]> {
  if (!caughtUp) {
    caughtUp = true;
    await catchUp().catch((error) => console.error("inventory catch-up", error));
  }
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  let rows: StockRow[] = [];
  const sql = await pg();
  if (sql) {
    const out = (await sql`SELECT product_id, name, qty, updated_at FROM inventory ORDER BY name`) as Array<
      Record<string, unknown>
    >;
    rows = out.map((row) => ({
      productId: String(row.product_id),
      name: String(row.name),
      qty: Number(row.qty) || 0,
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    }));
  } else {
    const db = await my();
    if (db) {
      const [out] = await db.query("SELECT product_id, name, qty, updated_at FROM inventory ORDER BY name");
      rows = (out as Array<Record<string, unknown>>).map((row) => ({
        productId: String(row.product_id),
        name: String(row.name),
        qty: Number(row.qty) || 0,
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      }));
    } else {
      rows = [...memStock().values()].sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  cache = { at: Date.now(), rows };
  return rows;
}

/** productId → qty, for tracked products only. Untracked products are never auto-sold-out. */
export async function stockMap(): Promise<Map<string, number>> {
  try {
    return new Map((await listStock()).map((row) => [row.productId, row.qty]));
  } catch (error) {
    console.error("inventory read", error);
    return new Map();
  }
}

/** Admin: set an absolute count (first count, restock or correction). Creates the row if needed. */
export async function setStock(productId: string, qty: number): Promise<StockRow[]> {
  const name = INVENTORY_NAMES[productId];
  if (!name) throw new Error("Unknown can.");
  const clean = Math.max(0, Math.min(100000, Math.round(qty)));
  const sql = await pg();
  if (sql) {
    await sql`
      INSERT INTO inventory (product_id, name, qty, updated_at) VALUES (${productId}, ${name}, ${clean}, NOW())
      ON CONFLICT (product_id) DO UPDATE SET qty = EXCLUDED.qty, name = EXCLUDED.name, updated_at = NOW()
    `;
  } else {
    const db = await my();
    if (db) {
      await db.query(
        "INSERT INTO inventory (product_id, name, qty, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE qty = VALUES(qty), name = VALUES(name), updated_at = NOW()",
        [productId, name, clean],
      );
    } else {
      memStock().set(productId, { productId, name, qty: clean, updatedAt: new Date().toISOString() });
    }
  }
  cache = null;
  // A newly counted can may have paid orders since the baseline waiting for it: catch up now.
  caughtUp = false;
  return listStock(true);
}

/** Every tracked can for /admin, including ones with no count yet (qty null). */
export async function stockView(): Promise<StockView[]> {
  const rows = new Map((await listStock(true)).map((row) => [row.productId, row]));
  return Object.entries(INVENTORY_NAMES).map(([productId, name]) => {
    const row = rows.get(productId);
    return { productId, name, qty: row ? row.qty : null, updatedAt: row?.updatedAt ?? "" };
  });
}

function paidAt(order: ShopOrder): string {
  return order.capturedAt || order.verifiedAt || order.createdAt;
}

/** Count of each tracked can in an order (mystery lines already carry the assigned edition's id). */
function cansIn(order: ShopOrder): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of order.items) {
    if (!INVENTORY_NAMES[item.productId]) continue;
    out.set(item.productId, (out.get(item.productId) ?? 0) + Math.max(0, item.qty));
  }
  return out;
}

export type StockChange = { productId: string; name: string; before: number; after: number };

/**
 * Take a paid order's cans off stock — once per order, and only for orders paid after the
 * baseline (older ones were subtracted by hand). Safe to call repeatedly for the same order.
 */
export async function applyPaidOrder(order: ShopOrder): Promise<StockChange[]> {
  if (order.status !== "paid") return [];
  if (paidAt(order) < INVENTORY_BASELINE) return [];
  const cans = cansIn(order);
  // Only cans that already have a count. If counts aren't loaded yet, don't mark the order as
  // done, so it's still subtracted once the counts exist.
  const tracked = new Set((await listStock(true)).map((row) => row.productId));
  for (const productId of [...cans.keys()]) if (!tracked.has(productId)) cans.delete(productId);
  if (!cans.size) return [];
  const detail = [...cans].map(([id, n]) => `${id}×${n}`).join(",");
  const changes: StockChange[] = [];

  const sql = await pg();
  if (sql) {
    const claimed = (await sql`
      INSERT INTO inventory_moves (order_id, detail) VALUES (${order.id}, ${detail})
      ON CONFLICT (order_id) DO NOTHING RETURNING order_id
    `) as unknown[];
    if (!claimed.length) return [];
    for (const [productId, n] of cans) {
      const rows = (await sql`
        UPDATE inventory SET qty = qty - ${n}, updated_at = NOW() WHERE product_id = ${productId}
        RETURNING name, qty
      `) as Array<{ name: string; qty: number }>;
      if (rows[0]) {
        changes.push({ productId, name: rows[0].name, before: Number(rows[0].qty) + n, after: Number(rows[0].qty) });
      }
    }
  } else {
    const db = await my();
    if (db) {
      const [res] = await db.query("INSERT IGNORE INTO inventory_moves (order_id, created_at, detail) VALUES (?, NOW(), ?)", [
        order.id,
        detail,
      ]);
      if (!(res as { affectedRows?: number }).affectedRows) return [];
      for (const [productId, n] of cans) {
        await db.query("UPDATE inventory SET qty = qty - ?, updated_at = NOW() WHERE product_id = ?", [n, productId]);
        const [rows] = await db.query("SELECT name, qty FROM inventory WHERE product_id = ?", [productId]);
        const row = (rows as Array<{ name: string; qty: number }>)[0];
        if (row) changes.push({ productId, name: row.name, before: Number(row.qty) + n, after: Number(row.qty) });
      }
    } else {
      if (memMoves().has(order.id)) return [];
      memMoves().add(order.id);
      for (const [productId, n] of cans) {
        const row = memStock().get(productId);
        if (!row) continue;
        const after = row.qty - n;
        memStock().set(productId, { ...row, qty: after, updatedAt: new Date().toISOString() });
        changes.push({ productId, name: row.name, before: row.qty, after });
      }
    }
  }
  cache = null;
  return changes;
}

/** Changes that crossed into "low" or "sold out" — these are what we email about. */
export function stockAlerts(changes: StockChange[]): Array<StockChange & { kind: "sold_out" | "low" }> {
  const out: Array<StockChange & { kind: "sold_out" | "low" }> = [];
  for (const change of changes) {
    if (change.after <= 0 && change.before > 0) out.push({ ...change, kind: "sold_out" });
    else if (change.after <= LOW_STOCK_AT && change.before > LOW_STOCK_AT) out.push({ ...change, kind: "low" });
  }
  return out;
}
