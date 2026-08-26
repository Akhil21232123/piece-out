export type OrderItem = {
  productId: string;
  name: string;
  withFrame: boolean;
  qty: number;
  unitPrice: number;
};

export type OrderStatus = "pending" | "paid" | "failed";

export type ShopOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  name: string;
  phone: string;
  address: string;
  utr: string;
  total: number;
  items: OrderItem[];
  paymentId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
};
