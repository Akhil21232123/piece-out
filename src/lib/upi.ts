import { BRAND } from "./brand";

export function buildUpiQuery(amount: number, orderId: string): string {
  const am = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return [
    `pa=${BRAND.vpa}`,
    `pn=${encodeURIComponent(BRAND.payeeName)}`,
    `am=${am}`,
    `cu=${BRAND.currency}`,
    `tn=${encodeURIComponent(orderId)}`,
  ].join("&");
}

export function buildUpiUri(amount: number, orderId: string): string {
  return `upi://pay?${buildUpiQuery(amount, orderId)}`;
}

export function upiAppLinks(amount: number, orderId: string) {
  const q = buildUpiQuery(amount, orderId);
  return {
    generic: `upi://pay?${q}`,
    gpay: `tez://upi/pay?${q}`,
    phonepe: `phonepe://pay?${q}`,
    paytm: `paytmmp://pay?${q}`,
  };
}
