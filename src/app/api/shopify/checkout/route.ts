import { NextResponse } from "next/server";
import { isEmail, normalizePhone } from "@/lib/checkout";
import { createShopifyCheckout, type CheckoutItem } from "@/lib/shopifyCart";
import { shopifyStorefrontConfigured } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isItem(value: unknown): value is CheckoutItem {
  if (!value || typeof value !== "object") return false;
  const item = value as CheckoutItem;
  return (
    typeof item.productId === "string" &&
    typeof item.withFrame === "boolean" &&
    Number.isFinite(item.qty) &&
    item.qty > 0
  );
}

export async function POST(request: Request) {
  if (!shopifyStorefrontConfigured()) {
    return NextResponse.json({ error: "Shopify is not connected." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout." }, { status: 400 });
  }

  const payload = body as { items?: unknown; email?: string; phone?: string };
  const items = Array.isArray(payload.items) ? payload.items.filter(isItem) : [];
  if (!items.length) {
    return NextResponse.json({ error: "Bag is empty." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(payload.phone ?? "");
  try {
    const cart = await createShopifyCheckout(
      items,
      request,
      {
        email: isEmail(email) ? email : undefined,
        phone: /^\d{10}$/.test(phone) ? `+91${phone}` : undefined,
      },
    );
    return NextResponse.json(
      { ok: true, checkoutUrl: cart.checkoutUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not open Shopify checkout." },
      { status: 400 },
    );
  }
}
