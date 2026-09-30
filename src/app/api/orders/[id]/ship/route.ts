import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches, getOrder } from "@/lib/orders";
import { bookShipmentById, saveTracking } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const token = jar.get("po_admin")?.value ?? "";
  if (!adminPassword() || !cookieMatches(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as { awb?: string; partner?: string; book?: boolean };
  const current = await getOrder(id);
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  try {
    if (payload.awb?.trim()) {
      const next = await saveTracking(id, payload.awb, payload.partner);
      return NextResponse.json({ ok: true, order: next });
    }
    if (payload.book) {
      const next = await bookShipmentById(id);
      return NextResponse.json({ ok: true, order: next });
    }
    return NextResponse.json({ error: "Paste an AWB or book with Delhivery." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update shipping.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
