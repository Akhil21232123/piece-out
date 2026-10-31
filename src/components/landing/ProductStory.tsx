"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Product } from "@/data/products";
import { DROP_ID, isProductSoldOut, productCompare, productMerchandiseId, productPrice } from "@/data/products";
import { BRAND } from "@/lib/brand";
import { DealPrice } from "@/components/brand/DealPrice";
import { useCartStore } from "@/store/cartStore";
import { playAddToCart } from "@/lib/cartBurst";
import { FrameSwitch } from "./FrameSwitch";

gsap.registerPlugin(useGSAP);

export function ProductStory({
  product,
  onClose,
  onNotify,
}: {
  product: Product | null;
  onClose: () => void;
  onNotify: (product: Product) => void;
}) {
  return (
    <AnimatePresence>
      {product && (
        <StoryDialog key={product.id} product={product} onClose={onClose} onNotify={onNotify} />
      )}
    </AnimatePresence>
  );
}

function storyFrames(product: Product) {
  const extras = (product.shots ?? []).filter((src) => src !== product.image);
  return [product.image, ...extras];
}

function StoryDialog({
  product,
  onClose,
  onNotify,
}: {
  product: Product;
  onClose: () => void;
  onNotify: (product: Product) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const [withFrame, setWithFrame] = useState(false);
  const [added, setAdded] = useState(false);
  const [shot, setShot] = useState(0);
  const [paused, setPaused] = useState(false);
  const add = useCartStore((state) => state.add);
  const mystery = product.id === DROP_ID;
  const soldOut = isProductSoldOut(product);
  const frames = storyFrames(product);
  const lifestyle = (product.shots?.length ?? 0) > 0;
  const current = frames[shot] ?? product.image;
  const qty = useCartStore((state) =>
    state.lines
      .filter((line) => line.productId === product.id && line.withFrame === withFrame)
      .reduce((sum, line) => sum + line.qty, 0),
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setShot((n) => (n + 1) % frames.length);
      if (e.key === "ArrowLeft") setShot((n) => (n - 1 + frames.length) % frames.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, frames.length]);

  useEffect(() => {
    if (frames.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setShot((n) => (n + 1) % frames.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [frames.length, paused]);

  useGSAP(
    () => {
      const reel = reelRef.current;
      if (!reel) return;
      const slides = gsap.utils.toArray<HTMLElement>(reel.querySelectorAll(".story-slide"));
      if (!slides.length) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fade = reduced ? 0 : 1.15;

      slides.forEach((slide, index) => {
        const on = index === shot;
        const ken = slide.querySelector<HTMLElement>(".story-ken");
        gsap.set(slide, { zIndex: on ? 2 : 1 });
        gsap.to(slide, {
          autoAlpha: on ? 1 : 0,
          duration: fade,
          ease: "power2.inOut",
          overwrite: "auto",
        });
        if (!ken) return;
        gsap.killTweensOf(ken, "scale");
        if (on && !reduced) {
          gsap.fromTo(
            ken,
            { scale: 1 },
            { scale: 1.04, duration: 8.4, ease: "none", force3D: true },
          );
        } else {
          gsap.set(ken, { scale: 1 });
        }
      });
    },
    { scope: reelRef, dependencies: [shot] },
  );

  const addToCart = () => {
    if (soldOut) return;
    add({
      productId: product.id,
      name: product.name,
      image: product.image,
      line: product.line,
      withFrame,
      unitPrice: productPrice(product, withFrame),
      merchandiseId: productMerchandiseId(product, withFrame),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      playAddToCart({
        button: addBtnRef.current?.getBoundingClientRect() ?? new DOMRect(),
        photo: photoRef.current?.getBoundingClientRect(),
        image: current,
      });
    } else {
      window.dispatchEvent(new Event("po-cart-catch"));
    }
  };

  const go = (to: number) => {
    setPaused(true);
    setShot(((to % frames.length) + frames.length) % frames.length);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#171411]/55 p-0 md:items-center md:p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close story"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-story-title"
        initial={{ y: 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 22, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-[100svh] max-h-[100svh] w-full max-w-[min(96vw,80rem)] flex-col overflow-hidden rounded-t-[1.4rem] border border-[#171411]/10 bg-[#fffaf3] shadow-2xl md:h-[min(86vh,42rem)] md:max-h-[92vh] md:rounded-[1.4rem]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-2.5 md:px-6">
          <p className="text-xs font-bold tracking-[0.16em] text-[#e31b23]">The story</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="text-[#7a7268] transition hover:text-[#171411]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            ref={photoRef}
            className="story-reel relative h-[min(36svh,15rem)] w-full shrink-0 sm:h-[min(38svh,17rem)] md:h-full md:min-h-0 md:flex-1"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
          >
            <div ref={reelRef} className="absolute inset-0">
              {frames.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className={`story-slide${index === 0 ? " is-first" : ""}`}
                >
                  <div className="story-ken">
                    <Image
                      src={src}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      quality={100}
                      unoptimized
                      preload={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      draggable={false}
                      className={`${lifestyle ? "object-cover md:object-contain" : "object-contain"} ${
                        soldOut ? "sold-out-shot" : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
            {frames.length > 1 && (
              <div className="story-nav absolute inset-0 z-30">
                <button
                  type="button"
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffaf3]/90 text-xl font-extrabold text-[#171411] shadow-sm"
                  aria-label="Previous photo"
                  onClick={() => go(shot - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffaf3]/90 text-xl font-extrabold text-[#171411] shadow-sm"
                  aria-label="Next photo"
                  onClick={() => go(shot + 1)}
                >
                  ›
                </button>
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                  {frames.map((src, index) => (
                    <button
                      key={`dot-${src}-${index}`}
                      type="button"
                      aria-label={`${product.name} photo ${index + 1}`}
                      aria-current={shot === index ? "true" : undefined}
                      onClick={() => go(index)}
                      className={`h-2.5 rounded-full shadow-sm ${shot === index ? "w-8 bg-[#171411]" : "w-2.5 bg-[#fffaf3]/90"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 md:w-[min(100%,24rem)] md:flex-none md:px-6 md:py-5 lg:w-[26rem]">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2
                  id="product-story-title"
                  className="text-2xl font-extrabold tracking-tight text-[#171411] md:text-3xl"
                >
                  {product.name}
                </h2>
                <p className="mt-0.5 text-sm text-[#7a7268]">{product.line}</p>
              </div>
              <p className="text-right">
                <DealPrice
                  withFrame={withFrame}
                  amount={productPrice(product, withFrame)}
                  compare={productCompare(product, withFrame)}
                  className="text-lg text-[#171411]"
                />
              </p>
            </div>

            <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#7a7268]">
              {BRAND.pieces} pieces · 1 hour
            </p>

            <p className="mt-3 text-[15px] leading-relaxed text-[#5e574e] md:text-base">
              {product.story}
            </p>

            <div className="mt-4 flex flex-col gap-3 pb-1">
              {!soldOut ? <FrameSwitch withFrame={withFrame} onChange={setWithFrame} /> : null}
              <button
                ref={addBtnRef}
                type="button"
                onClick={soldOut ? () => onNotify(product) : addToCart}
                className={`min-h-12 rounded-full py-3 text-sm font-extrabold ${
                  soldOut
                    ? "bg-[#e31b23] text-white hover:bg-[#171411]"
                    : added
                      ? "bg-[#f5c400] text-[#171411]"
                      : "bg-[#171411] text-[#fffaf3] hover:bg-[#e31b23]"
                }`}
              >
                {soldOut
                  ? "Notify me"
                  : added
                    ? "Added"
                    : qty > 0
                      ? `Add another · ${qty} in bag`
                      : mystery
                        ? "Add Mystery Puzzle"
                        : "Add to cart"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
