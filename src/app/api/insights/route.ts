import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { insightsStoreReady, listInsights, parseInsightEvents, recordInsights } from "@/lib/insights";
import { adminPassword, cookieMatches } from "@/lib/orders";

export const dynamic = "force-dynamic";

function authed(token: string) {
  return Boolean(adminPassword() && cookieMatches(token));
}

export async function GET() {
  const jar = await cookies();
  if (!authed(jar.get("po_admin")?.value ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const days = await listInsights(7);
  return NextResponse.json({
    days,
    today: days[days.length - 1] ?? null,
    live: insightsStoreReady(),
    at: Date.now(),
  });
}

export async function POST(req: Request) {
  const text = await req.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const events = parseInsightEvents(payload);
  if (!events.length) return NextResponse.json({ ok: true, n: 0 });
  try {
    await recordInsights(events);
    return NextResponse.json({ ok: true, n: events.length, live: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, n: 0, error: error instanceof Error ? error.message : "store failed" },
      { status: 500 },
    );
  }
}
