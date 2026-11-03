import { NextResponse } from "next/server";
import { MAX_PHOTO_BYTES, photoStoreReady, savePhoto, sniffImage } from "@/lib/customPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Customer photo upload for /custom. Body is the raw image (the browser sends a compressed JPEG). */
export async function POST(request: Request) {
  if (!photoStoreReady()) {
    return NextResponse.json(
      { error: "Custom orders are paused for a moment. Try again soon." },
      { status: 503 },
    );
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "That photo is too big. Try a smaller one." }, { status: 413 });
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(await request.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read the photo." }, { status: 400 });
  }
  if (!bytes.length) {
    return NextResponse.json({ error: "Add a photo first." }, { status: 400 });
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "That photo is too big. Try a smaller one." }, { status: 413 });
  }
  const mime = sniffImage(bytes);
  if (!mime) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 415 });
  }
  const url = new URL(request.url);
  const orientation = url.searchParams.get("o") === "landscape" ? "landscape" : "portrait";
  const width = Math.max(0, Math.round(Number(url.searchParams.get("w")) || 0));
  const height = Math.max(0, Math.round(Number(url.searchParams.get("h")) || 0));
  try {
    const id = await savePhoto({ bytes, mime, orientation, width, height });
    return NextResponse.json({ id });
  } catch (error) {
    console.error("custom photo upload", error);
    return NextResponse.json({ error: "Could not save the photo. Try again." }, { status: 500 });
  }
}
