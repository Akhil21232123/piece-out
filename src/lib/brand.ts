export const BRAND = {
  name: "piece/out",
  tagline: "puzzles you can pop open",
  vpa: "7981590780@fam",
  payeeName: "piece/out",
  whatsapp: "917981590780",
  priceBare: 500,
  priceFrame: 600,
  currency: "INR",
} as const;

export const COLOR = {
  pink: "#F6D0DA",
  pinkDeep: "#F3B9C8",
  label: "#F5B7C6",
  ink: "#111111",
  red: "#E31B23",
  yellow: "#FFD54A",
  aluminum: "#C8CCD2",
} as const;

export const CHAPTER_VH = 2.55;
export const PUZZLE_COUNT = 1;

export function formatInr(amount: number): string {
  return `₹${amount}`;
}

export function priceFor(withFrame: boolean): number {
  return withFrame ? BRAND.priceFrame : BRAND.priceBare;
}

export function makeOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PO-";
  for (let i = 0; i < 4; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
