import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let ready = false;

export function mysqlConfigured(): boolean {
  return Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
}

export function mysqlPool(): mysql.Pool | null {
  if (!mysqlConfigured()) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      enableKeepAlive: true,
      ...(process.env.MYSQL_SSL === "true" ? { ssl: {} } : {}),
    });
  }
  return pool;
}

export async function ensureMysqlRestock(db: mysql.Pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS restock_alerts (
      id VARCHAR(40) PRIMARY KEY,
      created_at DATETIME NOT NULL,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      product_id VARCHAR(40) NOT NULL,
      product_name VARCHAR(160) NOT NULL,
      UNIQUE KEY restock_alerts_phone_product (phone, product_id),
      KEY restock_alerts_created_at (created_at)
    )
  `);
}

export async function ensureMysqlSchema(db: mysql.Pool) {
  if (ready) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id VARCHAR(16) PRIMARY KEY,
      created_at DATETIME NOT NULL,
      status VARCHAR(16) NOT NULL,
      name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NOT NULL DEFAULT '',
      phone VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      total INT NOT NULL,
      items JSON NOT NULL,
      utr VARCHAR(32) NULL,
      payment_id VARCHAR(64) NULL,
      razorpay_order_id VARCHAR(64) NULL,
      failure_reason TEXT NULL,
      captured_at DATETIME NULL,
      settled_at DATETIME NULL,
      settlement_id VARCHAR(64) NULL,
      settlement_utr VARCHAR(64) NULL,
      UNIQUE KEY shop_orders_rzp (razorpay_order_id),
      KEY shop_orders_created_at (created_at)
    )
  `);
  try {
    await db.query("ALTER TABLE shop_orders ADD COLUMN email VARCHAR(190) NOT NULL DEFAULT ''");
  } catch {
    /* already present */
  }
  for (const sql of [
    "ALTER TABLE shop_orders ADD COLUMN captured_at DATETIME NULL",
    "ALTER TABLE shop_orders ADD COLUMN settled_at DATETIME NULL",
    "ALTER TABLE shop_orders ADD COLUMN settlement_id VARCHAR(64) NULL",
    "ALTER TABLE shop_orders ADD COLUMN settlement_utr VARCHAR(64) NULL",
    "ALTER TABLE shop_orders ADD COLUMN verified_at DATETIME NULL",
    "ALTER TABLE shop_orders ADD COLUMN payment_method VARCHAR(32) NULL",
    "ALTER TABLE shop_orders ADD COLUMN payment_vpa VARCHAR(80) NULL",
    "ALTER TABLE shop_orders ADD COLUMN razorpay_amount INT NULL",
    "ALTER TABLE shop_orders ADD COLUMN subtotal INT NULL",
    "ALTER TABLE shop_orders ADD COLUMN gst INT NULL",
    "ALTER TABLE shop_orders ADD COLUMN shipping_fee INT NULL",
    "ALTER TABLE shop_orders ADD COLUMN pincode VARCHAR(8) NULL",
    "ALTER TABLE shop_orders ADD COLUMN city VARCHAR(80) NULL",
    "ALTER TABLE shop_orders ADD COLUMN state VARCHAR(80) NULL",
    "ALTER TABLE shop_orders ADD COLUMN shipping_partner VARCHAR(80) NULL",
    "ALTER TABLE shop_orders ADD COLUMN awb VARCHAR(40) NULL",
    "ALTER TABLE shop_orders ADD COLUMN shiprocket_order_id VARCHAR(64) NULL",
    "ALTER TABLE shop_orders ADD COLUMN shiprocket_shipment_id VARCHAR(64) NULL",
    "ALTER TABLE shop_orders ADD COLUMN tracking_url VARCHAR(240) NULL",
    "ALTER TABLE shop_orders ADD COLUMN shipped_at DATETIME NULL",
    "ALTER TABLE shop_orders ADD COLUMN shipping_error TEXT NULL",
    "ALTER TABLE shop_orders ADD COLUMN shopify_order_id VARCHAR(64) NULL",
  ]) {
    try {
      await db.query(sql);
    } catch {
      /* already present */
    }
  }
  await ensureMysqlRestock(db);
  ready = true;
}
