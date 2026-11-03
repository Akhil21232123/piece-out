import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPhoto } from "@/lib/customPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Admin-only download of a customer's custom-puzzle photo. Add ?view=1 to open it in the browser. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Sign in to /admin first." }, { status: 401 });
  }
  const { id } = await context.params;
  const photo = await getPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  const view = new URL(request.url).searchParams.get("view") === "1";
  const name = `${photo.orderId ?? "custom"}-${photo.orientation}-${photo.id}.${EXT[photo.mime] ?? "jpg"}`;
  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.bytes.length),
      "Content-Disposition": `${view ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
