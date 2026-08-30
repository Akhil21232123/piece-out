import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches, emailOrder, getOrder, updateOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIVE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404, headers: LIVE_HEADERS });
  }
  return NextResponse.json(
    {
      id: order.id,
      status: order.status,
      total: order.total,
      confirming: Boolean(order.utr) && order.status === "pending",
      failureReason: order.failureReason ?? "",
    },
    { headers: LIVE_HEADERS },
  );
}

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

  const status = (body as { status?: string }).status;
  if (status !== "paid" && status !== "failed") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const current = await getOrder(id);
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const next = await updateOrder(id, {
    status,
    failureReason: status === "failed" ? "Marked failed by staff" : "",
  });
  if (next && current.status !== next.status) {
    try {
      await emailOrder(next);
    } catch {
      /* dashboard still updates */
    }
  }
  return NextResponse.json({ id, status: next?.status ?? status });
}

