import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let ready = false;

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
}

export function sqlClient(): Sql | null {
  const url = databaseUrl();
  if (!url) return null;
  return neon(url);
}

export async function ensureRestockTable(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS restock_alerts (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS restock_alerts_phone_product ON restock_alerts (phone, product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS restock_alerts_created_at ON restock_alerts (created_at DESC)`;
}

export async function ensureSchema(sql: Sql) {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total INTEGER NOT NULL,
      items JSONB NOT NULL,
      utr TEXT,
      payment_id TEXT,
      razorpay_order_id TEXT UNIQUE,
      failure_reason TEXT
    )
  `;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS settlement_id TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS settlement_utr TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS payment_method TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS payment_vpa TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS razorpay_amount INTEGER`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS subtotal INTEGER`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS gst INTEGER`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipping_fee INTEGER`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS pincode TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS city TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS state TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipping_partner TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS awb TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS tracking_url TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipping_error TEXT`;
  await sql`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shopify_order_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS shop_orders_created_at ON shop_orders (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS shop_orders_email ON shop_orders (email)`;
  await sql`CREATE INDEX IF NOT EXISTS shop_orders_status ON shop_orders (status)`;
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS waitlist_created_at ON waitlist (created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS restock_alerts (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS restock_alerts_phone_product ON restock_alerts (phone, product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS restock_alerts_created_at ON restock_alerts (created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS shop_insight_events (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      day TEXT NOT NULL,
      sid TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT,
      x DOUBLE PRECISION,
      y DOUBLE PRECISION,
      views INTEGER,
      ms INTEGER
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS shop_insight_events_day ON shop_insight_events (day, kind)`;
  await sql`CREATE INDEX IF NOT EXISTS shop_insight_events_sid ON shop_insight_events (sid)`;
  ready = true;
}

export async function addWaitlistEmail(email: string): Promise<void> {
  const sql = sqlClient();
  if (!sql) return;
  await ensureSchema(sql);
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO waitlist (id, email)
    VALUES (${id}, ${email})
    ON CONFLICT (email) DO NOTHING
  `;
}
