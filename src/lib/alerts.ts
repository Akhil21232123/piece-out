import { promises as fs } from "fs";
import path from "path";
import { ensureRestockTable, ensureSchema, sqlClient } from "./db";
import { ensureMysqlRestock, ensureMysqlSchema, mysqlPool } from "./mysql";

export type RestockAlert = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  productId: string;
  productName: string;
};

const TMP_FILE = path.join("/tmp", "piece-out-alerts.json");

type GlobalAlerts = typeof globalThis & { __pieceOutAlerts?: RestockAlert[] };

function memory(): RestockAlert[] {
  const g = globalThis as GlobalAlerts;
  if (!g.__pieceOutAlerts) g.__pieceOutAlerts = [];
  return g.__pieceOutAlerts;
}

function normalize(row: RestockAlert): RestockAlert {
  return {
    id: String(row.id),
    createdAt: row.createdAt,
    name: row.name,
    phone: row.phone,
    productId: row.productId,
    productName: row.productName,
  };
}

async function readFileStore(): Promise<RestockAlert[]> {
  try {
    const raw = await fs.readFile(TMP_FILE, "utf8");
    const parsed = JSON.parse(raw) as RestockAlert[];
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

async function writeFileStore(rows: RestockAlert[]) {
  await fs.writeFile(TMP_FILE, JSON.stringify(rows.slice(0, 400)), "utf8");
}

export function cleanPhone(input: string): string {
  return input.replace(/\D/g, "").slice(-10);
}

export function cleanName(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, 80);
}

function makeId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "NT-";
  for (let i = 0; i < 4; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

function upsertMemory(row: RestockAlert) {
  const list = memory();
  const i = list.findIndex((item) => item.phone === row.phone && item.productId === row.productId);
  if (i >= 0) list[i] = row;
  else list.unshift(row);
}

async function upsertFile(row: RestockAlert) {
  const list = await readFileStore();
  const i = list.findIndex((item) => item.phone === row.phone && item.productId === row.productId);
  if (i >= 0) list[i] = row;
  else list.unshift(row);
  await writeFileStore(list);
}

async function pgSave(row: RestockAlert) {
  const sql = sqlClient();
  if (!sql) return;
  await ensureSchema(sql);
  await ensureRestockTable(sql);
  await sql`
    INSERT INTO restock_alerts (id, created_at, name, phone, product_id, product_name)
    VALUES (${row.id}, ${row.createdAt}, ${row.name}, ${row.phone}, ${row.productId}, ${row.productName})
    ON CONFLICT (phone, product_id) DO UPDATE SET
      name = EXCLUDED.name,
      product_name = EXCLUDED.product_name
  `;
}

async function mysqlSave(row: RestockAlert) {
  const db = mysqlPool();
  if (!db) return;
  await ensureMysqlSchema(db);
  await ensureMysqlRestock(db);
  await db.query(
    `INSERT INTO restock_alerts (id, created_at, name, phone, product_id, product_name)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), product_name = VALUES(product_name)`,
    [row.id, new Date(row.createdAt), row.name, row.phone, row.productId, row.productName],
  );
}

async function pgList(): Promise<RestockAlert[]> {
  const sql = sqlClient();
  if (!sql) return [];
  await ensureSchema(sql);
  await ensureRestockTable(sql);
  const rows = (await sql`
    SELECT id, created_at, name, phone, product_id, product_name
    FROM restock_alerts
    ORDER BY created_at DESC
    LIMIT 400
  `) as Array<{
    id: string;
    created_at: string;
    name: string;
    phone: string;
    product_id: string;
    product_name: string;
  }>;
  return rows.map((row) =>
    normalize({
      id: row.id,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
      name: row.name,
      phone: row.phone,
      productId: row.product_id,
      productName: row.product_name,
    }),
  );
}

async function mysqlList(): Promise<RestockAlert[]> {
  const db = mysqlPool();
  if (!db) return [];
  await ensureMysqlSchema(db);
  await ensureMysqlRestock(db);
  const [rows] = await db.query(
    `SELECT id, created_at, name, phone, product_id, product_name
     FROM restock_alerts
     ORDER BY created_at DESC
     LIMIT 400`,
  );
  if (!Array.isArray(rows)) return [];
  return (rows as Array<Record<string, unknown>>).map((row) =>
    normalize({
      id: String(row.id),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at ?? new Date().toISOString()),
      name: String(row.name ?? ""),
      phone: String(row.phone ?? ""),
      productId: String(row.product_id ?? ""),
      productName: String(row.product_name ?? ""),
    }),
  );
}

export async function saveRestockAlert(input: {
  name: string;
  phone: string;
  productId: string;
  productName: string;
}): Promise<RestockAlert> {
  const name = cleanName(input.name);
  const phone = cleanPhone(input.phone);
  if (name.length < 2) throw new Error("Enter your name.");
  if (phone.length !== 10) throw new Error("Enter a 10-digit mobile number.");
  const row: RestockAlert = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    name,
    phone,
    productId: input.productId.slice(0, 40),
    productName: input.productName.slice(0, 160),
  };
  upsertMemory(row);
  await upsertFile(row);
  await mysqlSave(row).catch((error) => {
    console.error("[restock] mysql", error);
  });
  await pgSave(row).catch((error) => {
    console.error("[restock] neon", error);
  });
  return row;
}

export async function listRestockAlerts(): Promise<RestockAlert[]> {
  const [fromPg, fromMysql, fromFile] = await Promise.all([
    pgList().catch(() => [] as RestockAlert[]),
    mysqlList().catch(() => [] as RestockAlert[]),
    readFileStore().catch(() => [] as RestockAlert[]),
  ]);
  const seen = new Set<string>();
  const out: RestockAlert[] = [];
  for (const row of [...fromPg, ...fromMysql, ...fromFile, ...memory()]) {
    const key = `${row.phone}:${row.productId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
