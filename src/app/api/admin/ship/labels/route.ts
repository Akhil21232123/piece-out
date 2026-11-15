import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminPassword, cookieMatches } from "@/lib/orders";
import { ensureWaybills } from "@/lib/shipFlow";
import { labelsPdf } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/admin/ship/labels?ids=PO-1,PO-2 → one PDF with every Delhivery label, in that order. */
export async function GET(request: Request) {
  const jar = await cookies();
  if (!adminPassword() || !cookieMatches(jar.get("po_admin")?.value ?? "")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const orders = await ensureWaybills(ids);
    const byId = new Map(orders.map((o) => [o.id, o.awb ?? ""]));
    const awbs = ids.map((id) => byId.get(id) ?? "").filter(Boolean);
    const pdf = await labelsPdf(awbs);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pieceout-labels-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not make labels.";
    return new NextResponse(`Labels failed: ${message}`, { status: 400, headers: { "Content-Type": "text/plain" } });
  }
}
