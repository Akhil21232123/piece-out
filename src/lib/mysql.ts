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

export async function ensureMysqlSchema(db: mysql.Pool) {
  if (ready) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id VARCHAR(16) PRIMARY KEY,
      created_at DATETIME NOT NULL,
      status VARCHAR(16) NOT NULL,
      name VARCHAR(160) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      total INT NOT NULL,
      items JSON NOT NULL,
      utr VARCHAR(32) NULL,
      payment_id VARCHAR(64) NULL,
      razorpay_order_id VARCHAR(64) NULL,
      failure_reason TEXT NULL,
      UNIQUE KEY shop_orders_rzp (razorpay_order_id),
      KEY shop_orders_created_at (created_at)
    )
  `);
  ready = true;
}
