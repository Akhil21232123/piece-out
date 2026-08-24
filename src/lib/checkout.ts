import { BRAND } from "./brand";

export type CheckoutItem = {
  productId: string;
  name: string;
  subtitle: string;
  withFrame: boolean;
  price: number;
};

export function buildUpiQuery(amount: number): string {
  const am = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return [
    `pa=${BRAND.vpa}`,
    `pn=${encodeURIComponent("PieceOut")}`,
    `am=${am}`,
    `cu=INR`,
    `tn=${encodeURIComponent("piece out puzzle")}`,
  ].join("&");
}

export function buildUpiPayUri(amount: number): string {
  return `upi://pay?${buildUpiQuery(amount)}`;
}

export function buildUpiIntentUri(amount: number): string {
  return `intent://pay?${buildUpiQuery(amount)}#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
}

export function upiAppHrefs(amount: number) {
  const q = buildUpiQuery(amount);
  return {
    any: `upi://pay?${q}`,
    gpay: `tez://upi/pay?${q}`,
    phonepe: `phonepe://upi/pay?${q}`,
    paytm: `paytmmp://pay?${q}`,
    intent: buildUpiIntentUri(amount),
  };
}

export function launchUpi(amount: number) {
  const hrefs = upiAppHrefs(amount);
  const android = /Android/i.test(navigator.userAgent);
  window.location.href = android ? hrefs.intent : hrefs.any;
}
