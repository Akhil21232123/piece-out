import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { makeOrderId, parcelWeightG, payableOf } from "@/lib/brand";
import {
  DROP_ID,
  inStockEditionsFrom,
  isProductSoldOut,
  productMerchandiseId,
  productPrice,
  type Product,
} from "@/data/products";
import { saveOrder, type OrderItem, type ShopOrder } from "@/lib/orders";
import { isEmail, normalizePhone } from "@/lib/checkout";
import { addressLooksComplete, isPincode, normalizePincode } from "@/lib/pincode";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { quoteDelhiveryCharge, resolveShipTo } from "@/lib/shipping";
import { loadCatalog } from "@/lib/shopifyCatalog";

export const runtime = "nodejs";

function isItem(value: unknown): value is Pick<OrderItem, "productId" | "withFrame" | "qty" | "merchandiseId"> {
  if (!value || typeof value !== "object") return false;
  const item = value as OrderItem;
  return (
    typeof item.productId === "string" &&
    typeof item.withFrame === "boolean" &&
    Number.isFinite(item.qty) &&
    item.qty > 0
  );
}

function assignEdition(pool: Product[]) {
  const product = pool[randomInt(pool.length)];
  if (!product) {
    throw new Error("Drop catalog is empty.");
  }
  return product;
}

function lineOf(product: Product, withFrame: boolean, qty: number, name: string, merchandiseId?: string): OrderItem {
  return {
    productId: product.id,
    name,
    withFrame,
    qty,
    unitPrice: productPrice(product, withFrame),
    merchandiseId: merchandiseId || productMerchandiseId(product, withFrame),
  };
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
    pincode?: string;
    items?: unknown;
  };

  const name = payload.name?.trim() ?? "";
  const email = (payload.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(payload.phone ?? "");
  const address = payload.address?.trim() ?? "";
  const pincode = normalizePincode(payload.pincode ?? "");
  const rawItems = Array.isArray(payload.items) ? payload.items.filter(isItem) : [];
  const { products } = await loadCatalog();
  const catalog = new Map(products.map((product) => [product.id, product]));
  const editions = inStockEditionsFrom(products);
  const items: OrderItem[] = [];
  for (const item of rawItems) {
    const qty = Math.min(9, Math.max(1, Math.floor(item.qty)));
    if (item.productId === DROP_ID) {
      if (!editions.length) {
        return NextResponse.json({ error: "Mystery Puzzle is sold out." }, { status: 400 });
      }
      for (let n = 0; n < qty; n++) {
        const assigned = assignEdition(editions);
        const existing = items.find(
          (line) => line.productId === assigned.id && line.withFrame === item.withFrame,
        );
        if (existing) {
          existing.qty += 1;
          continue;
        }
        items.push(lineOf(assigned, item.withFrame, 1, `mystery · ${assigned.name}`));
      }
      continue;
    }
    const product = catalog.get(item.productId);
    if (!product || product.id === DROP_ID) continue;
    if (isProductSoldOut(product)) {
      return NextResponse.json(
        { error: `${product.name} is sold out.` },
        { status: 400 },
      );
    }
    items.push(lineOf(product, item.withFrame, qty, product.name, item.merchandiseId));
  }

  if (!name || !email || !phone || !address || !pincode) {
    return NextResponse.json(
      { error: "Name, email, phone, full address, and 6-digit pincode are required." },
      { status: 400 },
    );
  }
  if (!isPincode(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }
  if (!addressLooksComplete(address)) {
    return NextResponse.json(
      { error: "Add house / flat, street, and area so Delhivery can find the door." },
      { status: 400 },
    );
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
  if (!razorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 503 },
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const place = await resolveShipTo(pincode);
  if (!place.ok || !place.city || !place.state) {
    return NextResponse.json(
      { error: place.reason || "Enter a valid Indian pincode." },
      { status: 400 },
    );
  }
  const shipping = await quoteDelhiveryCharge(pincode, parcelWeightG(items));
  const { gst, total } = payableOf(subtotal, shipping);
  const id = makeOrderId();

  let razorpayOrderId = "";
  try {
    razorpayOrderId = await createRazorpayOrder(total, id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Razorpay.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const order: ShopOrder = {
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
    name,
    email,
    phone,
    address,
    pincode,
    city: place.city,
    state: place.state,
    utr: "",
    subtotal,
    gst,
    shippingFee: shipping,
    total,
    items,
    razorpayOrderId,
  };

  try {
    await saveOrder(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    id: order.id,
    subtotal: order.subtotal,
    gst: order.gst,
    shipping: order.shippingFee,
    total: order.total,
    amount: order.total * 100,
    currency: "INR",
    keyId: razorpayKeyId(),
    razorpayOrderId,
    name,
    email,
    phone,
  });
}
