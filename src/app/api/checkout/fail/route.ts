import { NextResponse } from "next/server";
import { emailOrder, getOrder, updateOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = typeof (body as { id?: string }).id === "string" ? (body as { id: string }).id : "";
  const reason =
    typeof (body as { reason?: string }).reason === "string"
      ? (body as { reason: string }).reason
      : "Payment failed";

  if (!id) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }

  const current = await getOrder(id);
  if (!current) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (current.status === "paid") {
    return NextResponse.json({ id: current.id, status: current.status });
  }

  const failed = await updateOrder(id, { status: "failed", failureReason: reason });
  if (failed && current.status !== "failed") {
    try {
      await emailOrder(failed);
    } catch {
      /* dashboard still updates */
    }
  }
  return NextResponse.json({ id, status: "failed" });
}
