"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { CartBar } from "@/components/landing/CartBar";
import { CheckoutModal } from "@/components/landing/CheckoutModal";
import { Footer } from "@/components/landing/Chrome";
import { PuzzleField } from "@/components/landing/PuzzleField";
import { DealPrice } from "@/components/brand/DealPrice";
import { FreeShipping } from "@/components/brand/FreeShipping";
import { BRAND, CUSTOM_PUZZLE, FREE_SHIPPING, formatInr } from "@/lib/brand";
import { cartCount, useCartStore } from "@/store/cartStore";

type Orientation = "portrait" | "landscape";
type Picked = { file: File; url: string; width: number; height: number };
type Stage = "idle" | "working" | "added";

/** A4 at 300 dpi: 3508 px on the long edge. Uploads stay under Vercel's 4.5 MB body limit. */
const PRINT_LONG_EDGE = 3508;
const MAX_UPLOAD = 3_900_000;
/** Below this the print may look soft (≈ 150 dpi on A4). */
const SOFT_LONG_EDGE = 1750;

const STEPS = [
  { n: "01", title: "send your photo", note: "a face, a trip, your dog, your people." },
  { n: "02", title: "we print it", note: `${BRAND.pieces} pieces, ${CUSTOM_PUZZLE.size}, packed in the can.` },
  { n: "03", title: "pop, build, hang", note: "the frame is in the box. on us." },
] as const;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function sizeOf(source: ImageBitmap | HTMLImageElement) {
  return "naturalWidth" in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Resize to print size and compress to a JPEG small enough to upload, plus a tiny thumbnail for the bag. */
async function prepare(file: File) {
  const source = await decode(file);
  const { width, height } = sizeOf(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || !width || !height) throw new Error("Couldn't open that photo.");
  let scale = Math.min(1, PRINT_LONG_EDGE / Math.max(width, height));
  let blob: Blob | null = null;
  for (let pass = 0; pass < 6 && !blob; pass += 1) {
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.92, 0.86, 0.8]) {
      const next = await toBlob(canvas, quality);
      if (next && next.size <= MAX_UPLOAD) {
        blob = next;
        break;
      }
    }
    scale *= 0.82;
  }
  if (!blob) throw new Error("That photo is too big. Try a smaller one.");
  const out = { blob, width: canvas.width, height: canvas.height };
  const t = 220 / Math.max(width, height);
  canvas.width = Math.max(1, Math.round(width * t));
  canvas.height = Math.max(1, Math.round(height * t));
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const thumb = canvas.toDataURL("image/jpeg", 0.8);
  if ("close" in source) source.close();
  return { ...out, thumb };
}

export function CustomPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const count = useCartStore((state) => cartCount(state.lines));
  const add = useCartStore((state) => state.add);
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const url = picked?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [picked?.url]);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const openCheckout = useCallback(() => {
    if (cartCount(useCartStore.getState().lines) > 0) setCheckoutOpen(true);
  }, []);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setStage("idle");
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setError("That isn't a photo. Pick a JPG or PNG.");
      return;
    }
    try {
      const source = await decode(file);
      const { width, height } = sizeOf(source);
      if ("close" in source) source.close();
      setPicked({ file, url: URL.createObjectURL(file), width, height });
      setOrientation(width > height ? "landscape" : "portrait");
    } catch {
      setError("Couldn't open that photo. Try a JPG or PNG from your gallery.");
    }
  };

  const addToBag = async () => {
    if (!picked || stage === "working") return;
    setError("");
    setStage("working");
    try {
      const ready = await prepare(picked.file);
      const query = new URLSearchParams({
        o: orientation,
        w: String(ready.width),
        h: String(ready.height),
      });
      const res = await fetch(`/api/custom/photo?${query}`, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: ready.blob,
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || "Upload failed. Try again.");
      add({
        productId: CUSTOM_PUZZLE.id,
        name: CUSTOM_PUZZLE.name,
        image: ready.thumb,
        line: `${CUSTOM_PUZZLE.line} · ${orientation}`,
        withFrame: true,
        unitPrice: CUSTOM_PUZZLE.price,
        photoId: data.id,
      });
      setStage("added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      setStage("idle");
    }
  };

  const startOver = () => {
    setPicked(null);
    setStage("idle");
    setError("");
    inputRef.current?.click();
  };

  const longEdge = picked ? Math.max(picked.width, picked.height) : 0;
  const soft = picked != null && longEdge < SOFT_LONG_EDGE;
  const ratio = orientation === "portrait" ? "210 / 297" : "297 / 210";

  return (
    <main className={`relative min-h-dvh overflow-x-hidden bg-transparent text-[#171411] ${count > 0 ? "pb-36" : ""}`}>
      <div className="paper-drift" aria-hidden />
      <PuzzleField />
      <div className="relative z-10 isolate">
        <Nav onCheckout={openCheckout} />
        <section className="relative overflow-x-clip px-4 pb-16 pt-24 md:px-8 md:pb-28 md:pt-32">
          <div className="mx-auto grid max-w-[1400px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12">
            <div className="lg:col-start-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e31b23]">
                customised · made from your photo
              </p>
              <h1 className="type-on-field mt-3 text-[clamp(2.5rem,9vw,5.2rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-[#171411]">
                your photo.
                <br />
                in a can.
              </h1>
              <p className="font-hand mt-3 text-[1.6rem] leading-none text-[#9b2242] md:text-3xl">
                {BRAND.pieces} pieces. A4. frame on us.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <DealPrice
                  amount={CUSTOM_PUZZLE.price}
                  compare={CUSTOM_PUZZLE.compare}
                  className="text-2xl text-[#171411]"
                />
                <span className="inline-flex items-center rounded-full bg-[#e31b23] px-2.5 py-1 text-[11px] font-extrabold uppercase leading-none tracking-[0.14em] text-[#fffaf3]">
                  free frame
                </span>
                {FREE_SHIPPING ? <FreeShipping /> : null}
              </div>
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="mx-auto w-full max-w-[30rem] rounded-[1.6rem] border border-[#171411]/10 bg-[#fffaf3]/85 p-4 shadow-[0_24px_60px_rgb(23_20_17_/_0.12)] sm:p-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onPick}
                  aria-label="Choose your photo"
                />
                {picked ? (
                  <>
                    <div className="flex justify-center rounded-[1.1rem] bg-[#efe8dc] p-5">
                      <div
                        className="relative w-full overflow-hidden border-[10px] border-[#171411] bg-[#171411] shadow-[0_18px_40px_rgb(23_20_17_/_0.3)] transition-all duration-300"
                        style={{ aspectRatio: ratio, maxWidth: orientation === "portrait" ? "17rem" : "100%" }}
                      >
                        <Image
                          src={picked.url}
                          alt="Your photo, as it will be cut to A4"
                          fill
                          sizes="30rem"
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex rounded-full border border-[#171411]/12 bg-[#efe8dc] p-1" role="group" aria-label="Orientation">
                        {(["portrait", "landscape"] as const).map((item) => (
                          <button
                            key={item}
                            type="button"
                            aria-pressed={orientation === item}
                            onClick={() => setOrientation(item)}
                            disabled={stage !== "idle"}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold capitalize transition ${
                              orientation === item ? "bg-[#171411] text-[#fffaf3]" : "text-[#171411]"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={startOver}
                        disabled={stage === "working"}
                        className="text-xs font-extrabold text-[#e31b23] underline-offset-4 hover:underline"
                      >
                        {stage === "added" ? "Add another photo" : "Change photo"}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-[#7a7268]">
                      We print exactly what&apos;s inside the frame ({CUSTOM_PUZZLE.size}).
                    </p>
                    {soft ? (
                      <p className="mt-2 rounded-[0.9rem] bg-[#f5c400]/30 px-3 py-2 text-xs font-semibold text-[#5e4a00]">
                        This photo is small ({picked.width}×{picked.height}). It may print a little soft. The
                        original from your camera roll will look sharper.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="group flex w-full flex-col items-center justify-center rounded-[1.1rem] border-2 border-dashed border-[#171411]/25 bg-[#efe8dc] px-6 text-center transition hover:border-[#e31b23]"
                    style={{ aspectRatio: "4 / 5" }}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#171411] text-3xl font-extrabold leading-none text-[#f5c400] transition group-hover:bg-[#e31b23] group-hover:text-[#fffaf3]">
                      +
                    </span>
                    <span className="mt-4 text-xl font-extrabold tracking-tight text-[#171411]">add your photo</span>
                    <span className="mt-1 text-sm text-[#7a7268]">from your gallery · JPG or PNG</span>
                  </button>
                )}

                {error ? (
                  <p className="mt-3 text-sm font-semibold text-[#e31b23]" role="alert">
                    {error}
                  </p>
                ) : null}

                {stage === "added" ? (
                  <button
                    type="button"
                    onClick={openCheckout}
                    className="mt-4 min-h-12 w-full rounded-full bg-[#f5c400] py-3 text-sm font-extrabold text-[#171411]"
                  >
                    In your bag · Checkout
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={picked ? addToBag : () => inputRef.current?.click()}
                    disabled={stage === "working"}
                    className="mt-4 min-h-12 w-full rounded-full bg-[#171411] py-3 text-sm font-extrabold text-[#fffaf3] transition hover:bg-[#e31b23] disabled:opacity-70"
                  >
                    {stage === "working"
                      ? "Uploading your photo…"
                      : picked
                        ? `Add to cart · ${formatInr(CUSTOM_PUZZLE.price)}`
                        : "Choose a photo"}
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-start-1">
              <ol className="grid max-w-md gap-4">
                {STEPS.map((step) => (
                  <li key={step.n} className="flex gap-4">
                    <span className="text-sm font-extrabold tabular-nums text-[#e31b23]">{step.n}</span>
                    <span>
                      <span className="block text-lg font-extrabold tracking-tight text-[#171411]">{step.title}</span>
                      <span className="block text-sm text-[#5e574e]">{step.note}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 max-w-md text-sm text-[#7a7268]">
                Best photos: sharp, well lit, with the subject big in the frame. Want a specific crop or
                something we should know? Message us after you order.
              </p>
              <Link
                href="/#shop"
                className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#171411]/16 bg-[#fffaf3] px-5 text-sm font-extrabold text-[#171411] transition hover:border-[#171411]/40"
              >
                Or shop the drop
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
      <CartBar onCheckout={openCheckout} hidden={checkoutOpen} />
      <CheckoutModal open={checkoutOpen} onClose={closeCheckout} />
    </main>
  );
}
