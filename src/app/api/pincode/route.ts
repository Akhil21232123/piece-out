import { NextResponse } from "next/server";
import { isPincode, normalizePincode } from "@/lib/pincode";
import { quoteDelhiveryCharge, resolveShipTo } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pin = normalizePincode(url.searchParams.get("pin") ?? "");
  if (!isPincode(pin)) {
    return NextResponse.json({ ok: false, error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }

  const weight = Math.max(100, Math.round(Number(url.searchParams.get("weight") || 500) || 500));
  const place = await resolveShipTo(pin);
  const delivery = place.ok ? await quoteDelhiveryCharge(pin, weight) : 0;
  return NextResponse.json({
    ok: place.ok,
    pincode: pin,
    city: place.city,
    state: place.state,
    locality: place.locality,
    serviceable: place.ok,
    delivery,
    error: place.ok ? "" : place.reason || "We cannot ship to this pincode yet.",
  });
}
