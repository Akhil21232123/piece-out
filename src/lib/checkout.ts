import { BRAND } from "./brand";

export type CheckoutItem = {
  productId: string;
  name: string;
  subtitle: string;
  withFrame: boolean;
  price: number;
};

export type UpiApp = "gpay" | "phonepe" | "paytm" | "bhim";

export function buildUpiQuery(amount: number, note?: string): string {
  const am = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const tn = encodeURIComponent(note || "piece out puzzle");
  return [
    `pa=${BRAND.vpa}`,
    `pn=${encodeURIComponent("PieceOut")}`,
    `am=${am}`,
    `cu=INR`,
    `tn=${tn}`,
  ].join("&");
}

export function buildUpiPayUri(amount: number, note?: string): string {
  return `upi://pay?${buildUpiQuery(amount, note)}`;
}

export function upiAppHrefs(amount: number, note?: string) {
  const q = buildUpiQuery(amount, note);
  return {
    gpay: {
      android: `intent://upi/pay?${q}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
      ios: `gpay://upi/pay?${q}`,
      other: `tez://upi/pay?${q}`,
    },
    phonepe: {
      android: `intent://pay?${q}#Intent;scheme=phonepe;package=com.phonepe.app;end`,
      ios: `phonepe://pay?${q}`,
      other: `phonepe://upi/pay?${q}`,
    },
    paytm: {
      android: `intent://pay?${q}#Intent;scheme=paytmmp;package=net.one97.paytm;end`,
      ios: `paytmmp://pay?${q}`,
      other: `paytmmp://pay?${q}`,
    },
    bhim: {
      android: `intent://pay?${q}#Intent;scheme=bhim;package=in.org.npci.upiapp;end`,
      ios: `bhim://pay?${q}`,
      other: `bhim://pay?${q}`,
    },
  } as const;
}

function platform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

export function hrefForUpiApp(app: UpiApp, amount: number, note?: string): string {
  return upiAppHrefs(amount, note)[app][platform()];
}

export function openUpiHref(href: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function openUpiApp(app: UpiApp, amount: number, note?: string) {
  openUpiHref(hrefForUpiApp(app, amount, note));
}
