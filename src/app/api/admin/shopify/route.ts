import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { importShopifyOrders } from "@/lib/shopifyOrders";
import { backfillPaidOrdersToShopify } from "@/lib/shopifyPush";
import { ensureShopifyCatalog, ensureShopifyReady, loadCatalog } from "@/lib/shopifyCatalog";
import {
  shopifyAdminConfigured,
  shopifyStoreDomain,
  shopifyStorefrontConfigured,
  shopifyWebhookSecret,
} from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const catalog = await loadCatalog();
  return NextResponse.json({
    storefront: shopifyStorefrontConfigured(),
    admin: shopifyAdminConfigured(),
    webhook: Boolean(shopifyWebhookSecret()),
    domain: shopifyStoreDomain(),
    products: catalog.products.length,
    shopify: catalog.shopify,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!shopifyAdminConfigured()) {
    return NextResponse.json({ error: "Shopify Admin token is missing." }, { status: 503 });
  }

  let action = "sync";
  try {
    const body = (await request.json()) as { action?: string };
    action = body.action ?? "sync";
  } catch {
    action = "sync";
  }

  if (action === "pull") {
    const orders = await importShopifyOrders();
    const pushed = await backfillPaidOrdersToShopify();
    return NextResponse.json({ ok: true, orders: orders.length, pushed });
  }

  const sync = await ensureShopifyCatalog();
  await ensureShopifyReady(true);
  const catalog = await loadCatalog(true);
  const orders = await importShopifyOrders();
  const pushed = await backfillPaidOrdersToShopify();
  return NextResponse.json({
    ok: true,
    created: sync.created,
    skipped: sync.skipped,
    errors: sync.errors,
    products: catalog.products.length,
    orders: orders.length,
    pushed,
  });
}
