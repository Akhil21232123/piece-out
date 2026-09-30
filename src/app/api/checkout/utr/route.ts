import { NextResponse } from "next/server";
import { isUtr } from "@/lib/checkout";
import { emailOrder, getOrder, updateOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as { id?: string; utr?: string };
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const utr = typeof payload.utr === "string" ? payload.utr.trim().toUpperCase() : "";

  if (!id) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }
  if (!isUtr(utr)) {
    return NextResponse.json({ error: "Enter the 12–22 character UPI reference / UTR." }, { status: 400 });
  }

  const current = await getOrder(id);
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (current.status === "paid") {
    return NextResponse.json({ ok: true, id: current.id, status: current.status });
  }

  const next = await updateOrder(id, { utr, failureReason: "" });
  if (next && next.utr !== current.utr) {
    try {
      await emailOrder(next);
    } catch {
      /* order is saved even if mail fails */
    }
  }

  return NextResponse.json({ ok: true, id, status: next?.status ?? current.status });
}
