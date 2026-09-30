import { ensureSchema, sqlClient } from "./db";
import {
  emptyDay,
  emptyHeat,
  heatIndex,
  kolkataDay,
  recentDays,
  type DayInsight,
  type InsightEvent,
  type InsightTap,
} from "./insightTypes";

export type { DayInsight, InsightEvent, InsightTap } from "./insightTypes";
export { HEAT_CELLS, HEAT_COLS, HEAT_ROWS, emptyDay, emptyHeat, kolkataDay, recentDays } from "./insightTypes";

function cleanSid(value: unknown) {
  const text = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return text.length >= 8 ? text : "";
}

function cleanLabel(value: unknown) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
  return text || "page";
}

function asRecord(row: Record<string, unknown>) {
  return row;
}

export function parseInsightEvents(raw: unknown): InsightEvent[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const out: InsightEvent[] = [];
  for (const item of list.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const sid = cleanSid(row.sid);
    const kind = String(row.kind ?? "");
    if (!sid || (kind !== "view" && kind !== "tap" && kind !== "leave" && kind !== "buy")) continue;
    out.push({
      sid,
      kind,
      path: String(row.path ?? "/").slice(0, 80),
      label: cleanLabel(row.label),
      x: Number(row.x),
      y: Number(row.y),
      views: Number(row.views) || 0,
      ms: Number(row.ms) || 0,
    });
  }
  return out;
}

let tableReady = false;

async function ensureInsights() {
  const sql = sqlClient();
  if (!sql) throw new Error("insights store is not configured");
  await ensureSchema(sql);
  if (tableReady) return sql;
  await sql`
    CREATE TABLE IF NOT EXISTS shop_insight_events (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      day TEXT NOT NULL,
      sid TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT,
      x DOUBLE PRECISION,
      y DOUBLE PRECISION,
      views INTEGER,
      ms INTEGER
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS shop_insight_events_day ON shop_insight_events (day, kind)`;
  await sql`CREATE INDEX IF NOT EXISTS shop_insight_events_sid ON shop_insight_events (sid)`;
  tableReady = true;
  return sql;
}

export async function recordInsights(events: InsightEvent[]) {
  const sql = await ensureInsights();
  const day = kolkataDay();
  for (const event of events) {
    await sql`
      INSERT INTO shop_insight_events (id, day, sid, kind, label, x, y, views, ms)
      VALUES (
        ${crypto.randomUUID()},
        ${day},
        ${event.sid},
        ${event.kind},
        ${event.label ?? "page"},
        ${Number.isFinite(event.x) ? event.x : null},
        ${Number.isFinite(event.y) ? event.y : null},
        ${event.views ?? 0},
        ${event.ms ?? 0}
      )
    `;
  }
  await sql`DELETE FROM shop_insight_events WHERE created_at < NOW() - INTERVAL '16 days'`;
}

function buildDay(date: string, rows: Array<Record<string, unknown>>): DayInsight {
  const day = emptyDay(date);
  const viewed = new Set<string>();
  const bought = new Set<string>();
  const left = new Map<string, { views: number; ms: number }>();
  const taps: Record<string, number> = {};
  const heat = emptyHeat();

  for (const raw of rows) {
    const row = asRecord(raw);
    const sid = String(row.sid ?? "");
    const kind = String(row.kind ?? "");
    if (kind === "view") {
      day.views += 1;
      if (sid) viewed.add(sid);
    }
    if (kind === "buy" && sid) bought.add(sid);
    if (kind === "tap") {
      const label = cleanLabel(row.label);
      taps[label] = (taps[label] ?? 0) + 1;
      const cell = heatIndex(row.x, row.y);
      if (cell >= 0) heat[cell] += 1;
    }
    if (kind === "leave" && sid && !left.has(sid)) {
      left.set(sid, { views: Number(row.views) || 0, ms: Number(row.ms) || 0 });
    }
  }

  day.viewers = viewed.size;
  day.bought = bought.size;
  for (const [sid, info] of left) {
    if (bought.has(sid)) continue;
    if (info.views <= 1 && info.ms < 16000) day.bounce += 1;
    else day.leftNoBuy += 1;
  }
  day.taps = Object.entries(taps)
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 16);
  day.heat = heat;
  return day;
}

export async function listInsights(days = 7): Promise<DayInsight[]> {
  const stamps = recentDays(days);
  const sql = sqlClient();
  if (!sql) return stamps.map((date) => emptyDay(date));
  await ensureInsights();
  const from = stamps[0];
  const rows = (await sql`
    SELECT day, sid, kind, label, x, y, views, ms
    FROM shop_insight_events
    WHERE day >= ${from}
  `) as Array<Record<string, unknown>>;
  const byDay = new Map<string, Array<Record<string, unknown>>>();
  for (const stamp of stamps) byDay.set(stamp, []);
  for (const row of rows) {
    const day = String(row.day ?? "");
    const list = byDay.get(day);
    if (list) list.push(row);
  }
  return stamps.map((date) => buildDay(date, byDay.get(date) ?? []));
}

export function insightsStoreReady() {
  return Boolean(sqlClient());
}
