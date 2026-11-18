import { NextResponse } from "next/server";
import { ordersPaused } from "@/lib/siteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: is the shop taking orders right now? */
export async function GET() {
  return NextResponse.json({ paused: await ordersPaused() }, { headers: { "Cache-Control": "no-store" } });
}
