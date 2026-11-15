import { sqlClient } from "./db";
import { mysqlPool } from "./mysql";

/**
 * What physically happened to each paid order, kept apart from the order row.
 *
 * A Delhivery waybill is created the moment an order is paid, but that only means a label
 * exists. These states say whether the parcel actually went out:
 *
 *   ready             label exists, parcel still with us
 *   pickup_requested  we asked Delhivery to collect it
 *   picked_up         Delhivery scanned it (tracking is live, customer emailed)
 *   delivered         Delhivery says delivered
 *   sent_other        went out some other way (local courier / by hand), not tracked here
 */
export type FulfillmentState = "ready" | "pickup_requested" | "picked_up" | "delivered" | "sent_other";

export type Fulfillment = {
  orderId: string;
  state: FulfillmentState;
  courierStatus: string;
  pickupRequestedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  shippedEmailAt?: string;
  updatedAt: string;
};

const g = globalThis as unknown as { __poFulfil?: Map<string, Fulfillment> };
function mem(): Map<string, Fulfillment> {
  if (!g.__poFulfil) g.__poFulfil = new Map();
  return g.__poFulfil;
}

let pgReady = false;
let myReady = false;

async function pg() {
  const sql = sqlClient();
  if (!sql) return null;
  if (!pgReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS fulfillment (
        order_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        courier_status TEXT NOT NULL DEFAULT '',
        pickup_requested_at TIMESTAMPTZ,
        picked_up_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        shipped_email_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    pgReady = true;
  }
  return sql;
}

async function my() {
  const db = mysqlPool();
  if (!db) return null;
  if (!myReady) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS fulfillment (
        order_id VARCHAR(40) PRIMARY KEY,
        state VARCHAR(24) NOT NULL,
        courier_status VARCHAR(120) NOT NULL DEFAULT '',
        pickup_requested_at DATETIME NULL,
        picked_up_at DATETIME NULL,
        delivered_at DATETIME NULL,
        shipped_email_at DATETIME NULL,
        updated_at DATETIME NOT NULL
      )
    `);
    myReady = true;
  }
  return db;
}

const iso = (value: unknown) => {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

function fromRow(row: Record<string, unknown>): Fulfillment {
  return {
    orderId: String(row.order_id),
    state: String(row.state) as FulfillmentState,
    courierStatus: String(row.courier_status ?? ""),
    pickupRequestedAt: iso(row.pickup_requested_at),
    pickedUpAt: iso(row.picked_up_at),
    deliveredAt: iso(row.delivered_at),
    shippedEmailAt: iso(row.shipped_email_at),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

/** MySQL DATETIME wants "YYYY-MM-DD HH:MM:SS" (UTC here). */
const myDate = (value?: string) => (value ? value.slice(0, 19).replace("T", " ") : null);

export async function listFulfillment(): Promise<Map<string, Fulfillment>> {
  const out = new Map<string, Fulfillment>();
  try {
    const sql = await pg();
    if (sql) {
      const rows = (await sql`SELECT * FROM fulfillment`) as Record<string, unknown>[];
      for (const row of rows) out.set(String(row.order_id), fromRow(row));
      return out;
    }
    const db = await my();
    if (db) {
      const [rows] = (await db.query("SELECT * FROM fulfillment")) as unknown as [Record<string, unknown>[]];
      for (const row of rows) out.set(String(row.order_id), fromRow(row));
      return out;
    }
  } catch (error) {
    console.error("fulfillment list", error);
  }
  return new Map(mem());
}

/** Merge a change into one order's record and save it. */
export async function setFulfillment(
  orderId: string,
  patch: Partial<Omit<Fulfillment, "orderId" | "updatedAt">>,
): Promise<Fulfillment> {
  const current = (await listFulfillment()).get(orderId);
  const next: Fulfillment = {
    orderId,
    state: "ready",
    courierStatus: "",
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    updatedAt: new Date().toISOString(),
  };
  try {
    const sql = await pg();
    if (sql) {
      await sql`
        INSERT INTO fulfillment (order_id, state, courier_status, pickup_requested_at, picked_up_at, delivered_at, shipped_email_at, updated_at)
        VALUES (${next.orderId}, ${next.state}, ${next.courierStatus}, ${next.pickupRequestedAt ?? null},
                ${next.pickedUpAt ?? null}, ${next.deliveredAt ?? null}, ${next.shippedEmailAt ?? null}, NOW())
        ON CONFLICT (order_id) DO UPDATE SET
          state = EXCLUDED.state,
          courier_status = EXCLUDED.courier_status,
          pickup_requested_at = EXCLUDED.pickup_requested_at,
          picked_up_at = EXCLUDED.picked_up_at,
          delivered_at = EXCLUDED.delivered_at,
          shipped_email_at = EXCLUDED.shipped_email_at,
          updated_at = NOW()
      `;
      return next;
    }
    const db = await my();
    if (db) {
      await db.query(
        `INSERT INTO fulfillment (order_id, state, courier_status, pickup_requested_at, picked_up_at, delivered_at, shipped_email_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE state = VALUES(state), courier_status = VALUES(courier_status),
           pickup_requested_at = VALUES(pickup_requested_at), picked_up_at = VALUES(picked_up_at),
           delivered_at = VALUES(delivered_at), shipped_email_at = VALUES(shipped_email_at), updated_at = UTC_TIMESTAMP()`,
        [
          next.orderId,
          next.state,
          next.courierStatus.slice(0, 120),
          myDate(next.pickupRequestedAt),
          myDate(next.pickedUpAt),
          myDate(next.deliveredAt),
          myDate(next.shippedEmailAt),
        ],
      );
      return next;
    }
  } catch (error) {
    console.error("fulfillment save", orderId, error);
  }
  mem().set(orderId, next);
  return next;
}

/** Orders still waiting to leave (no record yet counts as "ready"). */
export function stillToShip(state?: FulfillmentState) {
  return !state || state === "ready" || state === "pickup_requested";
}
