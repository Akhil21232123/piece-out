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
  await sql`CREATE INDEX IF NOT EXISTS shop_orders_created_at ON shop_orders (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS shop_orders_email ON shop_orders (email)`;
  ready = true;
}
