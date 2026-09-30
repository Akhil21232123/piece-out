"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/data/products";
import {
  CARD_SIZE,
  DROP_ID,
  isProductSoldOut,
  productCompare,
  productMerchandiseId,
  productPrice,
} from "@/data/products";
import { themeFor } from "@/data/productThemes";
import { formatInr } from "@/lib/brand";
import { DealPrice } from "@/components/brand/DealPrice";
import { useCartStore } from "@/store/cartStore";
import { FrameSwitch } from "./FrameSwitch";
import { ProductPuzzle } from "./ProductPuzzle";
import { playAddToCart } from "@/lib/cartBurst";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ProductCard({
  product,
  eager = false,
  slot = 0,
  onOpen,
  onNotify,
}: {
  product: Product;
  eager?: boolean;
  slot?: number;
  onOpen: () => void;
  onNotify: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const [withFrame, setWithFrame] = useState(false);
  const [added, setAdded] = useState(false);
  const [broken, setBroken] = useState(false);
  const [peelOn, setPeelOn] = useState(false);
  const add = useCartStore((state) => state.add);
  const seed = product.id.split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const soldOut = isProductSoldOut(product);

  useGSAP(
    (_context, contextSafe) => {
      const stage = stageRef.current;
      const float = floatRef.current;
      const host = hostRef.current;
      if (!stage) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const coarse = window.matchMedia("(pointer: coarse)").matches;

      if (!reduced && !coarse) {
        const sheen = sheenRef.current;
        if (sheen) {
          const shine = gsap.fromTo(
            sheen,
            { xPercent: -130 },
            {
              xPercent: 130,
              duration: 1.25,
              ease: "power2.inOut",
              repeat: -1,
              repeatDelay: 5.2,
              paused: true,
            },
          );
          ScrollTrigger.create({
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              if (self.isActive) shine.play();
              else shine.pause();
            },
          });
        }
        gsap.from(stage, {
          y: 36,
          autoAlpha: 0.14,
          duration: 0.95,
          ease: "power3.out",
          scrollTrigger: {
            trigger: stage,
            start: "top 92%",
            once: true,
          },
        });
        if (float) {
          const bob = gsap.to(float, {
            y: coarse ? -5 : -9,
            scale: coarse ? 1.01 : 1.012,
            rotation: seed % 2 ? 0.45 : -0.45,
            duration: 3.4 + (seed % 9) * 0.14,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: (seed % 12) * 0.09,
            paused: true,
          });
          ScrollTrigger.create({
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              if (self.isActive) bob.play();
              else bob.pause();
            },
          });
        }
        const stamp = stampRef.current;
        if (soldOut && stamp) {
          gsap.fromTo(
            stamp,
            { scale: 1.55, rotation: -28, autoAlpha: 0 },
            {
              scale: 1,
              rotation: -12,
              autoAlpha: 1,
              duration: 0.7,
              ease: "back.out(1.7)",
              scrollTrigger: {
                trigger: stage,
                start: "top 88%",
                once: true,
              },
            },
          );
          gsap.to(stamp, {
            y: -3,
            duration: 2.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 0.8,
          });
        }
      }

      const lift = liftRef.current;
      if (!host || !lift || reduced) return;
      const fine = window.matchMedia("(hover: hover)").matches;
      const safe = contextSafe ?? ((fn: () => void) => fn);
      const onEnter = safe(() => {
        gsap.to(lift, {
          y: -5,
          scale: 1.016,
          duration: 0.55,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
      const onLeave = safe(() => {
        gsap.to(lift, { y: 0, scale: 1, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      });
      const onPress = safe(() => {
        gsap.to(lift, { scale: 0.985, duration: 0.16, ease: "power2.out", overwrite: "auto" });
      });
      const onRelease = safe(() => {
        gsap.to(lift, {
          scale: fine ? 1.016 : 1,
          y: fine ? -5 : 0,
          duration: 0.38,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
      if (fine) {
        host.addEventListener("pointerenter", onEnter);
        host.addEventListener("pointerleave", onLeave);
      }
      host.addEventListener("pointerdown", onPress);
      host.addEventListener("pointerup", onRelease);
      host.addEventListener("pointercancel", onRelease);
      return () => {
        host.removeEventListener("pointerenter", onEnter);
        host.removeEventListener("pointerleave", onLeave);
        host.removeEventListener("pointerdown", onPress);
        host.removeEventListener("pointerup", onRelease);
        host.removeEventListener("pointercancel", onRelease);
      };
    },
    { scope: stageRef, dependencies: [product.id, soldOut] },
  );

  useGSAP(
    () => {
      const glass = glassRef.current;
      if (!glass) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (withFrame) {
        gsap.fromTo(
          glass,
          { autoAlpha: 0, scale: 0.94 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: reduced ? 0 : 0.28,
            ease: "power3.out",
            overwrite: "auto",
          },
        );
      } else {
        gsap.to(glass, {
          autoAlpha: 0,
          scale: 1.03,
          duration: reduced ? 0 : 0.18,
          ease: "power2.in",
          overwrite: "auto",
        });
      }
    },
    { scope: stageRef, dependencies: [withFrame] },
  );

  const mystery = product.id === DROP_ID;
  const qty = useCartStore((state) =>
    state.lines
      .filter((line) => line.productId === product.id && line.withFrame === withFrame)
      .reduce((sum, line) => sum + line.qty, 0),
  );
  const price = productPrice(product, withFrame);
  const theme = themeFor(product.id);
  useEffect(() => {
    const desktop =
      window.matchMedia("(hover: hover)").matches && window.matchMedia("(pointer: fine)").matches;
    setPeelOn(desktop && product.livePuzzle !== false);
  }, [product.livePuzzle]);
  void slot;

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
    const btn = addBtnRef.current;
    const host = hostRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && window.matchMedia("(hover: hover)").matches) {
      playAddToCart({
        button: (btn ?? host)?.getBoundingClientRect() ?? new DOMRect(),
        photo: host?.getBoundingClientRect(),
        image: product.image,
      });
      const lift = liftRef.current;
      if (lift) {
        gsap
          .timeline({ overwrite: "auto" })
          .to(lift, { scale: 0.965, duration: 0.1, ease: "power2.out" })
          .to(lift, { scale: 1.025, duration: 0.28, ease: "back.out(2.2)" })
          .to(lift, { scale: 1, duration: 0.4, ease: "power3.out" });
      }
      if (btn) {
        gsap
          .timeline({ overwrite: "auto" })
          .fromTo(btn, { scale: 1 }, { scale: 0.94, duration: 0.1, ease: "power2.out" })
          .to(btn, { scale: 1.04, duration: 0.22, ease: "back.out(2)" })
          .to(btn, { scale: 1, duration: 0.32, ease: "power3.out" });
      }
    } else {
      window.dispatchEvent(new Event("po-cart-catch"));
    }
  };

  return (
    <article
      id={product.id}
      className={`flex h-full min-w-0 flex-col scroll-mt-24 ${soldOut ? "is-sold-out" : ""}`}
    >
      <div ref={stageRef} className="puzzle-stage relative">
        <div ref={liftRef} className="puzzle-lift">
          <div ref={floatRef} className={peelOn ? "will-change-transform" : undefined}>
            <div
              ref={hostRef}
              className="puzzle-host relative overflow-hidden p-2.5 sm:rounded-[1.25rem] sm:p-3"
              style={{ background: "#efe8dc" }}
            >
              <div className="relative aspect-square overflow-hidden bg-[#efe8dc]">
                {broken ? (
                  <div
                    className="flex h-full w-full items-center justify-center text-sm font-extrabold text-[#171411]"
                    style={{ background: theme.pieces[0] }}
                  >
                    {product.name}
                  </div>
                ) : (
                  <Image
                    src={product.image}
                    alt={`${product.name} puzzle can and framed art`}
                    width={CARD_SIZE}
                    height={CARD_SIZE}
                    sizes="(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 360px"
                    quality={eager ? 90 : 75}
                    loading={eager ? "eager" : "lazy"}
                    decoding="async"
                    className={`product-shot absolute inset-0 h-full w-full max-w-none ${
                      product.fit === "contain" ? "object-contain" : "object-cover"
                    } ${soldOut ? "sold-out-shot" : ""}`}
                    onError={() => setBroken(true)}
                  />
                )}
                <span ref={sheenRef} className="product-sheen" aria-hidden />
                {peelOn && !broken && !soldOut && <ProductPuzzle product={product} />}
                <div ref={glassRef} className={`glass-pane ${withFrame ? "is-on" : ""}`} aria-hidden>
                  <span className="glass-glow" />
                </div>
                {soldOut ? (
                  <>
                    <div className="sold-out-veil" aria-hidden />
                    <span ref={stampRef} className="sold-out-stamp">
                      sold out
                    </span>
                  </>
                ) : null}
                <button
                  type="button"
                  className="absolute inset-0 z-[2] hidden [@media(hover:hover)]:block"
                  aria-label={`Open ${product.name} story`}
                  onClick={onOpen}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-[#fffaf3]/70 px-4 py-4 sm:px-2 sm:pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <button type="button" onClick={onOpen} className="min-w-0 text-left">
            <h3 className="text-lg font-extrabold tracking-tight text-[#171411]">{product.name}</h3>
            <p className="mt-0.5 text-sm text-[#7a7268]">{product.line}</p>
            <p className="mt-1 text-xs font-extrabold tracking-wide text-[#e31b23]">
              {soldOut ? "Gone for now" : "The story"}
            </p>
          </button>
          <p className="text-right">
            {soldOut ? (
              <span className="block text-lg font-extrabold tabular-nums text-[#7a7268] line-through decoration-[#e31b23]/40">
                {formatInr(price)}
              </span>
            ) : (
              <DealPrice
                withFrame={withFrame}
                amount={price}
                compare={productCompare(product, withFrame)}
                className="text-lg text-[#171411]"
              />
            )}
          </p>
        </div>
        {!soldOut ? <FrameSwitch withFrame={withFrame} onChange={setWithFrame} /> : null}
        <button
          ref={addBtnRef}
          type="button"
          onClick={soldOut ? onNotify : addToCart}
          className={`mt-auto min-h-12 w-full rounded-full py-3 text-sm font-extrabold transition ${
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
    </article>
  );
}
