export type OrderItem = {
  productId: string;
  name: string;
  withFrame: boolean;
  qty: number;
  unitPrice: number;
  merchandiseId?: string;
};

export type OrderStatus = "pending" | "paid" | "failed";

export type MoneyLane = "waiting" | "in_razorpay" | "in_bank" | "unverified" | "failed";

export type ShopOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode?: string;
  city?: string;
  state?: string;
  utr: string;
  subtotal?: number;
  gst?: number;
  shippingFee?: number;
  total: number;
  items: OrderItem[];
  paymentId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
  capturedAt?: string;
  settledAt?: string;
  settlementId?: string;
  settlementUtr?: string;
  verifiedAt?: string;
  paymentMethod?: string;
  paymentVpa?: string;
  razorpayAmountPaise?: number;
  shippingPartner?: string;
  awb?: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  trackingUrl?: string;
  shippedAt?: string;
  shippingError?: string;
  shopifyOrderId?: string;
};

export type BankDeposit = {
  id: string;
  amountInr: number;
  feesInr: number;
  utr: string;
  at: string;
  status: string;
};

export function moneyLane(order: ShopOrder): MoneyLane {
  if (order.status === "failed") return "failed";
  if (order.paymentMethod === "shopify" && order.status === "paid") return "in_bank";
  if (order.settlementUtr || order.settledAt) return "in_bank";
  if (order.verifiedAt && order.paymentId) return "in_razorpay";
  if (order.status === "paid" || order.paymentId) return "unverified";
  return "waiting";
}
