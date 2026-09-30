import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PRODUCTS, SHOP } from "@/data/products";
import { listRestockAlerts, saveRestockAlert } from "@/lib/alerts";
import { adminPassword, cookieMatches } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("po_admin")?.value ?? "";
  if (!adminPassword() || !cookieMatches(token)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const alerts = await listRestockAlerts();
  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body as { name?: string; phone?: string; productId?: string };
  const productId = typeof payload.productId === "string" ? payload.productId : "";
  const product = SHOP.find((item) => item.id === productId) ?? PRODUCTS.find((item) => item.id === productId);
  if (!product) {
    return NextResponse.json({ error: "That edition is not on the list." }, { status: 404 });
  }

  try {
    const alert = await saveRestockAlert({
      name: typeof payload.name === "string" ? payload.name : "",
      phone: typeof payload.phone === "string" ? payload.phone : "",
      productId: product.id,
      productName: product.name,
    });
    return NextResponse.json({ ok: true, id: alert.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
