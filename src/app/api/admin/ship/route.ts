import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { markReady, markSentOther, pickupFor, shipBoard, syncTracking } from "@/lib/shipFlow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  const jar = await cookies();
  return Boolean(adminPassword() && cookieMatches(jar.get("po_admin")?.value ?? ""));
}

/** Board for /admin/ship. Vercel cron also hits this with ?sync=1 to pull Delhivery status. */
export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sync = new URL(request.url).searchParams.get("sync") === "1";
  const result = sync ? await syncTracking().catch((e) => ({ error: String(e) })) : undefined;
  return NextResponse.json({ ok: true, sync: result, ...(await shipBoard()) });
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  try {
    if (body.action === "pickup") return NextResponse.json({ ok: true, pickup: await pickupFor(ids), ...(await shipBoard()) });
    if (body.action === "sent_other") {
      await markSentOther(ids);
      return NextResponse.json({ ok: true, ...(await shipBoard()) });
    }
    if (body.action === "ready") {
      for (const id of ids) await markReady(id);
      return NextResponse.json({ ok: true, ...(await shipBoard()) });
    }
    if (body.action === "sync") return NextResponse.json({ ok: true, sync: await syncTracking(), ...(await shipBoard()) });
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 400 });
  }
}
