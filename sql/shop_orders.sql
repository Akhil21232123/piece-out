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
);
