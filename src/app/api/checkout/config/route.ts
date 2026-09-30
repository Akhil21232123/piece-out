import { NextResponse } from "next/server";
import { durableStoreConfigured } from "@/lib/orders";
import { ensureSchema, sqlClient } from "@/lib/db";
import { razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { shippingConfigured } from "@/lib/shipping";
import { shopifyStorefrontConfigured } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    const sql = sqlClient();
    if (sql) {
      await ensureSchema(sql);
      await sql`SELECT 1`;
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      razorpay: razorpayConfigured(),
      shopify: shopifyStorefrontConfigured(),
      keyId: razorpayConfigured() ? razorpayKeyId() : "",
      live: true,
      durable: durableStoreConfigured(),
      dbOk,
      shipping: shippingConfigured(),
      via: "Delhivery",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
