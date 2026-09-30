import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/shopifyCatalog";
import { shopifyAdminConfigured, shopifyStorefrontConfigured } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await loadCatalog();
  return NextResponse.json(
    {
      shopify: catalog.shopify,
      storefront: shopifyStorefrontConfigured(),
      admin: shopifyAdminConfigured(),
      products: catalog.products,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
