import { randomBytes } from "crypto";
import { sqlClient } from "./db";
import { mysqlPool } from "./mysql";

/** Customer photos for custom puzzles. Stored in the same database as orders (Postgres first, then MySQL). */

export type PhotoOrientation = "portrait" | "landscape";

export type CustomPhoto = {
  id: string;
  createdAt: string;
  mime: string;
  orientation: PhotoOrientation;
  width: number;
  height: number;
  bytes: Buffer;
  orderId?: string;
};

/** Vercel caps a request body at 4.5 MB; the browser compresses below this. */
export const MAX_PHOTO_BYTES = 4_300_000;

const ID_RE = /^ph_[a-f0-9]{20}$/;

export function isPhotoId(value: unknown): value is string {
  return typeof value === "string" && ID_RE.test(value);
}

export function newPhotoId(): string {
  return `ph_${randomBytes(10).toString("hex")}`;
}

/** Production needs a real database; locally we fall back to memory so the page can be tried. */
export function photoStoreReady(): boolean {
  return Boolean(sqlClient() || mysqlPool()) || process.env.NODE_ENV !== "production";
}

const g = globalThis as unknown as { __poPhotos?: Map<string, CustomPhoto> };
function memory(): Map<string, CustomPhoto> {
  if (!g.__poPhotos) g.__poPhotos = new Map();
  return g.__poPhotos;
}

let pgReady = false;
let myReady = false;

async function pgTable() {
  const sql = sqlClient();
  if (!sql) return null;
  if (!pgReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS custom_photos (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        mime TEXT NOT NULL,
        orientation TEXT NOT NULL,
        width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL,
        data TEXT NOT NULL,
        order_id TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS custom_photos_order_id ON custom_photos (order_id)`;
    pgReady = true;
  }
  return sql;
}

async function mysqlTable() {
  const db = mysqlPool();
  if (!db) return null;
  if (!myReady) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS custom_photos (
        id VARCHAR(40) PRIMARY KEY,
        created_at DATETIME NOT NULL,
        mime VARCHAR(40) NOT NULL,
        orientation VARCHAR(12) NOT NULL,
        width INT NOT NULL DEFAULT 0,
        height INT NOT NULL DEFAULT 0,
        size_bytes INT NOT NULL,
        data LONGBLOB NOT NULL,
        order_id VARCHAR(40),
        KEY custom_photos_order_id (order_id)
      )
    `);
    myReady = true;
  }
  return db;
}

export async function savePhoto(input: {
  bytes: Buffer;
  mime: string;
  orientation: PhotoOrientation;
  width: number;
  height: number;
}): Promise<string> {
  const id = newPhotoId();
  const createdAt = new Date().toISOString();
  const sql = await pgTable();
  if (sql) {
    await sql`
      INSERT INTO custom_photos (id, created_at, mime, orientation, width, height, size_bytes, data)
      VALUES (${id}, ${createdAt}, ${input.mime}, ${input.orientation}, ${input.width}, ${input.height},
        ${input.bytes.length}, ${input.bytes.toString("base64")})
    `;
    return id;
  }
  const db = await mysqlTable();
  if (db) {
    await db.query(
      "INSERT INTO custom_photos (id, created_at, mime, orientation, width, height, size_bytes, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, createdAt.slice(0, 19).replace("T", " "), input.mime, input.orientation, input.width, input.height, input.bytes.length, input.bytes],
    );
    return id;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Photo storage is not set up.");
  }
  memory().set(id, { id, createdAt, ...input });
  return id;
}

export async function getPhoto(id: string): Promise<CustomPhoto | null> {
  if (!isPhotoId(id)) return null;
  const sql = await pgTable();
  if (sql) {
    const rows = (await sql`
      SELECT id, created_at, mime, orientation, width, height, data, order_id
      FROM custom_photos WHERE id = ${id} LIMIT 1
    `) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (row) {
      return {
        id: String(row.id),
        createdAt: new Date(String(row.created_at)).toISOString(),
        mime: String(row.mime),
        orientation: row.orientation === "landscape" ? "landscape" : "portrait",
        width: Number(row.width) || 0,
        height: Number(row.height) || 0,
        bytes: Buffer.from(String(row.data), "base64"),
        orderId: row.order_id ? String(row.order_id) : undefined,
      };
    }
  }
  const db = await mysqlTable();
  if (db) {
    const [rows] = await db.query(
      "SELECT id, created_at, mime, orientation, width, height, data, order_id FROM custom_photos WHERE id = ? LIMIT 1",
      [id],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (row) {
      return {
        id: String(row.id),
        createdAt: new Date(String(row.created_at)).toISOString(),
        mime: String(row.mime),
        orientation: row.orientation === "landscape" ? "landscape" : "portrait",
        width: Number(row.width) || 0,
        height: Number(row.height) || 0,
        bytes: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as Uint8Array),
        orderId: row.order_id ? String(row.order_id) : undefined,
      };
    }
  }
  return memory().get(id) ?? null;
}

export async function photoExists(id: string): Promise<boolean> {
  if (!isPhotoId(id)) return false;
  const sql = await pgTable();
  if (sql) {
    const rows = (await sql`SELECT 1 FROM custom_photos WHERE id = ${id} LIMIT 1`) as unknown[];
    if (rows.length) return true;
  }
  const db = await mysqlTable();
  if (db) {
    const [rows] = await db.query("SELECT 1 FROM custom_photos WHERE id = ? LIMIT 1", [id]);
    if ((rows as unknown[]).length) return true;
  }
  return memory().has(id);
}

/** Tag photos with the order that used them (best effort; the order's items also carry the photo id). */
export async function linkPhotos(photoIds: string[], orderId: string): Promise<void> {
  const ids = photoIds.filter(isPhotoId);
  if (!ids.length) return;
  try {
    const sql = await pgTable();
    if (sql) await sql`UPDATE custom_photos SET order_id = ${orderId} WHERE id = ANY(${ids})`;
    const db = await mysqlTable();
    if (db) await db.query("UPDATE custom_photos SET order_id = ? WHERE id IN (?)", [orderId, ids]);
  } catch (error) {
    console.error("link custom photos", orderId, error);
  }
  for (const id of ids) {
    const row = memory().get(id);
    if (row) row.orderId = orderId;
  }
}

/** JPEG/PNG/WebP sniff so random files can't be stored as "photos". */
export function sniffImage(bytes: Buffer): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}
