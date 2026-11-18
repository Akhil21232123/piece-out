import { sqlClient } from "./db";
import { mysqlPool } from "./mysql";

/**
 * Tiny key/value switches the shop owner flips from /admin (no redeploy, no Vercel access).
 * Today: "orders_paused". Missing key = default (orders open).
 */

const g = globalThis as unknown as { __poSettings?: Map<string, string> };
const mem = () => (g.__poSettings ??= new Map());
let pgReady = false;
let myReady = false;

async function pg() {
  const sql = sqlClient();
  if (!sql) return null;
  if (!pgReady) {
    await sql`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    pgReady = true;
  }
  return sql;
}

async function my() {
  const db = mysqlPool();
  if (!db) return null;
  if (!myReady) {
    await db.query(
      "CREATE TABLE IF NOT EXISTS site_settings (`key` VARCHAR(64) PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME NOT NULL)",
    );
    myReady = true;
  }
  return db;
}

async function getSetting(key: string): Promise<string | undefined> {
  try {
    const sql = await pg();
    if (sql) {
      const rows = (await sql`SELECT value FROM site_settings WHERE key = ${key}`) as { value: string }[];
      return rows[0]?.value;
    }
    const db = await my();
    if (db) {
      const [rows] = (await db.query("SELECT value FROM site_settings WHERE `key` = ?", [key])) as unknown as [
        { value: string }[],
      ];
      return rows[0]?.value;
    }
  } catch (error) {
    console.error("settings read", key, error);
  }
  return mem().get(key);
}

async function setSetting(key: string, value: string): Promise<void> {
  const sql = await pg();
  if (sql) {
    await sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    return;
  }
  const db = await my();
  if (db) {
    await db.query(
      "INSERT INTO site_settings (`key`, value, updated_at) VALUES (?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = UTC_TIMESTAMP()",
      [key, value],
    );
    return;
  }
  mem().set(key, value);
}

export async function ordersPaused(): Promise<boolean> {
  return (await getSetting("orders_paused")) === "1";
}

export async function setOrdersPaused(paused: boolean): Promise<void> {
  await setSetting("orders_paused", paused ? "1" : "0");
}
