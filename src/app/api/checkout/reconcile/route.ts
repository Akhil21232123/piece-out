import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { reconcileOrders } from "@/lib/reconcile";
import { syncTracking } from "@/lib/shipFlow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = request.headers.get("authorization") ?? "";
  if (secret && auth === `Bearer ${secret}`) return true;
  const jar = await cookies();
  return Boolean(adminPassword() && cookieMatches(jar.get("po_admin")?.value ?? ""));
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await reconcileOrders(true);
    // Second daily look at Delhivery (the other is the 7 pm IST cron on /api/admin/ship).
    const tracking = await syncTracking().catch(() => null);
    return NextResponse.json({ ok: true, ...result, tracking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconcile failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
