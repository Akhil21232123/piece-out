import { NextResponse } from "next/server";
import { durableStoreConfigured } from "@/lib/orders";
import { razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      razorpay: razorpayConfigured(),
      keyId: razorpayConfigured() ? razorpayKeyId() : "",
      live: true,
      durable: durableStoreConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
