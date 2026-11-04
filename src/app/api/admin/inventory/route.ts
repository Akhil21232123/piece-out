import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { INVENTORY_NAMES, setStock, stockView } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Admin-only stock counts. These numbers are never sent to the public site. */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json({ stock: await stockView() }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  let body: { productId?: unknown; qty?: unknown };
  try {
    body = (await request.json()) as { productId?: unknown; qty?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  const productId = typeof body.productId === "string" ? body.productId : "";
  const qty = Number(body.qty);
  if (!INVENTORY_NAMES[productId] || !Number.isFinite(qty) || qty < 0) {
    return NextResponse.json({ error: "Pick a can and a count of 0 or more." }, { status: 400, headers: NO_STORE });
  }
  await setStock(productId, qty);
  return NextResponse.json({ stock: await stockView() }, { headers: NO_STORE });
}
