export const BRAND = {
  name: "Empirique",
  tagline: "Some things aren't meant to be seen. Only felt.",
  vpa: "7981590780@fam",
  payeeName: "Empirique",
  whatsapp: "917981590780",
  priceBare: 399,
  priceFrame: 499,
  compareBare: 799,
  compareFrame: 899,
  gstRate: 0.12,
  gstPercent: 12,
  hsn: "9503",
  currency: "INR",
  pieces: 150,
} as const;

export const SHIPPING = {
  days: "3–5 days",
} as const;

export const COLOR = {
  void: "#070506",
  wine: "#4A0E1F",
  wineDeep: "#2A0812",
  oxblood: "#6B0F2A",
  gold: "#A8845C",
  goldDim: "#7A6248",
  cream: "#D4C4B0",
  creamDim: "#8A7A6E",
  ink: "#111111",
  pink: "#F6D0DA",
  pinkDeep: "#F3B9C8",
  label: "#F5B7C6",
  red: "#E31B23",
  yellow: "#FFD54A",
  aluminum: "#C8CCD2",
  purple: "#8A56B8",
  paper: "#F4EEF8",
} as const;

export const CHAPTER_VH = 2.55;
export const PUZZLE_COUNT = 1;

export function formatInr(amount: number): string {
  return `₹${amount}`;
}

export function priceFor(withFrame: boolean): number {
  return withFrame ? BRAND.priceFrame : BRAND.priceBare;
}

export function compareFor(withFrame: boolean): number {
  return withFrame ? BRAND.compareFrame : BRAND.compareBare;
}

export function gstOn(amount: number): number {
  return Math.round((amount * BRAND.gstRate) / (1 + BRAND.gstRate));
}

export function parcelWeightG(items: Array<{ qty: number; withFrame: boolean }>): number {
  const qty = Math.max(1, items.reduce((sum, item) => sum + item.qty, 0));
  return qty * (items.some((item) => item.withFrame) ? 850 : 500);
}

export function payableOf(
  subtotal: number,
  shipping = 0,
): { subtotal: number; gst: number; shipping: number; total: number } {
  const gst = gstOn(subtotal);
  const delivery = Math.max(0, Math.round(shipping));
  return { subtotal, gst, shipping: delivery, total: subtotal + delivery };
}

export function payableFor(withFrame: boolean): number {
  return payableOf(priceFor(withFrame)).total;
}

export function makeOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PO-";
  for (let i = 0; i < 4; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
