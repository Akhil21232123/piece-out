"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Product } from "@/data/products";
import { formatInr, priceFor } from "@/lib/brand";
import { useCartStore } from "@/store/cartStore";
import { FrameSwitch } from "./FrameSwitch";
import { ProductPuzzle } from "./ProductPuzzle";

gsap.registerPlugin(useGSAP);

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const [withFrame, setWithFrame] = useState(false);
  const [added, setAdded] = useState(false);
  const [broken, setBroken] = useState(false);
  const add = useCartStore((state) => state.add);

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

  const qty = useCartStore((state) =>
    state.lines
      .filter((line) => line.productId === product.id)
      .reduce((sum, line) => sum + line.qty, 0),
  );
  const price = priceFor(withFrame);
  const livePuzzle = product.livePuzzle !== false;

  const addToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      image: product.image,
      line: product.line,
      withFrame,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
    window.setTimeout(() => {
      window.dispatchEvent(new Event("po-cart-pulse"));
    }, 80);
    const lift = liftRef.current;
    if (!lift || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      lift,
      { scale: 1 },
      { scale: 0.985, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out", overwrite: "auto" },
    );
  };

  return (
    <article className="flex h-full min-w-0 flex-col">
      <div ref={stageRef} className="puzzle-stage relative">
        <div ref={liftRef} className="puzzle-lift">
          <div className="puzzle-host relative overflow-hidden bg-[#efe8dc] sm:rounded-[1.25rem]">
            {broken ? (
              <div
                className="flex w-full items-center justify-center bg-[#efe8dc] text-sm font-extrabold text-[#171411]"
                style={{ aspectRatio: `${product.width} / ${product.height}` }}
              >
                {product.name}
              </div>
            ) : (
              <Image
                src={product.image}
                alt={`${product.name} puzzle can and framed art`}
                width={product.width}
                height={product.height}
                sizes="(max-width: 640px) 100vw, 1024px"
                quality={100}
                unoptimized
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                className="product-shot h-auto w-full max-w-full"
                onError={() => setBroken(true)}
              />
            )}
            {livePuzzle && !broken && <ProductPuzzle product={product} />}
            <div ref={glassRef} className={`glass-pane ${withFrame ? "is-on" : ""}`} aria-hidden>
              <span className="glass-glow" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-[#fffaf3]/90 px-4 py-4 sm:bg-[#fffaf3]/80 sm:px-2 sm:pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-[#171411]">{product.name}</h3>
            <p className="mt-0.5 text-sm text-[#7a7268]">{product.line}</p>
          </div>
          <p className="text-lg font-extrabold tabular-nums text-[#171411]">{formatInr(price)}</p>
        </div>
        <FrameSwitch withFrame={withFrame} onChange={setWithFrame} />
        <button
          type="button"
          onClick={addToCart}
          className={`mt-auto min-h-12 rounded-full py-3 text-sm font-extrabold transition ${
            added
              ? "bg-[#f5c400] text-[#171411]"
              : "bg-[#171411] text-[#fffaf3] hover:bg-[#e31b23]"
          }`}
        >
          {added ? "Added" : qty > 0 ? `Add another · ${qty} in bag` : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
