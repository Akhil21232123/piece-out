import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { ordersPaused, setOrdersPaused } from "@/lib/siteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  if (!adminPassword() || !cookieMatches(jar.get("po_admin")?.value ?? "")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { paused?: unknown };
  if (typeof body.paused !== "boolean") return NextResponse.json({ error: "paused must be true/false" }, { status: 400 });
  await setOrdersPaused(body.paused);
  return NextResponse.json({ ok: true, paused: await ordersPaused() });
}
