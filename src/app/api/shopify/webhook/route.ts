import { NextResponse } from "next/server";
import { shopifyWebhookSecret, verifyShopifyWebhook } from "@/lib/shopify";
import { upsertShopifyWebhookOrder, type ShopifyRestOrder } from "@/lib/shopifyOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!shopifyWebhookSecret()) {
    return NextResponse.json({ error: "Shopify webhook secret is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
  if (!verifyShopifyWebhook(raw, hmac)) {
    return NextResponse.json({ error: "Invalid Shopify signature." }, { status: 401 });
  }

  const topic = (request.headers.get("x-shopify-topic") ?? "").toLowerCase();
  if (!topic.startsWith("orders/")) {
    return NextResponse.json({ ok: true });
  }

  let order: ShopifyRestOrder;
  try {
    order = JSON.parse(raw) as ShopifyRestOrder;
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  try {
    const saved = await upsertShopifyWebhookOrder(order);
    return NextResponse.json({ ok: true, id: saved.id, status: saved.status });
  } catch (err) {
    console.error("shopify webhook", err);
    return NextResponse.json({ error: "Could not save Shopify order." }, { status: 500 });
  }
}
