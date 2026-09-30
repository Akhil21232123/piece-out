import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches, listOrders } from "@/lib/orders";
import { reconcileOrders } from "@/lib/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const jar = await cookies();
  const token = jar.get("po_admin")?.value ?? "";
  if (!adminPassword() || !cookieMatches(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let bank = null;
  try {
    const result = await Promise.race([
      reconcileOrders(false, { ship: false }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("reconcile timeout")), 8000);
      }),
    ]);
    bank = result.bank;
  } catch {
    /* still return stored orders */
  }
  const orders = await listOrders();
  return NextResponse.json({ orders, bank });
}
