import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches, listOrders } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("po_admin")?.value ?? "";
  if (!adminPassword() || !cookieMatches(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const orders = await listOrders();
  return NextResponse.json({ orders });
}
