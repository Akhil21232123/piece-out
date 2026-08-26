import { NextResponse } from "next/server";
import { razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    razorpay: razorpayConfigured(),
    keyId: razorpayConfigured() ? razorpayKeyId() : "",
  });
}
