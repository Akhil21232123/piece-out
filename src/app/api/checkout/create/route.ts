import { NextResponse } from "next/server";
import { makeOrderId, priceFor } from "@/lib/brand";
import { PRODUCTS } from "@/data/products";
import { emailOrder, saveOrder, type OrderItem, type ShopOrder } from "@/lib/orders";
import { isEmail } from "@/lib/checkout";

export const runtime = "nodejs";

function isItem(value: unknown): value is Pick<OrderItem, "productId" | "withFrame" | "qty"> {
  if (!value || typeof value !== "object") return false;
  const item = value as OrderItem;
  return (
    typeof item.productId === "string" &&
    typeof item.withFrame === "boolean" &&
    Number.isFinite(item.qty) &&
    item.qty > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout." }, { status: 400 });
  }

  const payload = body as {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    items?: unknown;
  };

  const name = payload.name?.trim() ?? "";
  const email = (payload.email ?? "").trim().toLowerCase();
  const phone = (payload.phone ?? "").replace(/\s/g, "");
  const address = payload.address?.trim() ?? "";
  const rawItems = Array.isArray(payload.items) ? payload.items.filter(isItem) : [];
  const catalog = new Map(PRODUCTS.map((product) => [product.id, product]));
  const items: OrderItem[] = [];
  for (const item of rawItems) {
    const product = catalog.get(item.productId);
    if (!product) continue;
    const qty = Math.min(9, Math.max(1, Math.floor(item.qty)));
    items.push({
      productId: product.id,
      name: product.name,
      withFrame: item.withFrame,
      qty,
      unitPrice: priceFor(item.withFrame),
    });
  }

  if (!name || !email || !phone || !address) {
    return NextResponse.json({ error: "Name, email, phone, and full address are required." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a 10-digit phone number." }, { status: 400 });
  }
  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const order: ShopOrder = {
    id: makeOrderId(),
    createdAt: new Date().toISOString(),
    status: "pending",
    name,
    email,
    phone,
    address,
    utr: "",
    total: items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    items,
  };

  try {
    await saveOrder(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    await emailOrder(order);
  } catch {
    /* order is saved even if mail fails */
  }

  return NextResponse.json({
    ok: true,
    id: order.id,
    total: order.total,
  });
}
