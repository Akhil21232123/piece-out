export const HEAT_COLS = 24;
export const HEAT_ROWS = 16;
export const HEAT_CELLS = HEAT_COLS * HEAT_ROWS;

export type InsightTap = { label: string; n: number };

export type DayInsight = {
  date: string;
  viewers: number;
  views: number;
  bought: number;
  bounce: number;
  leftNoBuy: number;
  taps: InsightTap[];
  heat: number[];
};

export type InsightEvent = {
  sid: string;
  kind: "view" | "tap" | "leave" | "buy";
  path?: string;
  label?: string;
  x?: number;
  y?: number;
  views?: number;
  ms?: number;
};

export function emptyHeat() {
  return Array.from({ length: HEAT_CELLS }, () => 0);
}

export function emptyDay(date: string): DayInsight {
  return {
    date,
    viewers: 0,
    views: 0,
    bought: 0,
    bounce: 0,
    leftNoBuy: 0,
    taps: [],
    heat: emptyHeat(),
  };
}

export function kolkataDay(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function recentDays(count = 7) {
  return Array.from({ length: count }, (_, i) => kolkataDay(Date.now() - (count - 1 - i) * 86400000));
}

export function heatIndex(x: unknown, y: unknown) {
  const px = Math.min(1, Math.max(0, Number(x)));
  const py = Math.min(1, Math.max(0, Number(y)));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return -1;
  const col = Math.min(HEAT_COLS - 1, Math.floor(px * HEAT_COLS));
  const row = Math.min(HEAT_ROWS - 1, Math.floor(py * HEAT_ROWS));
  return row * HEAT_COLS + col;
}
