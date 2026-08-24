"use client";

import Image from "next/image";
import { ProductPuzzle } from "./ProductPuzzle";
import { PRODUCTS } from "@/data/products";

export function Hero() {
  const goShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="top" className="relative overflow-x-clip pt-16 md:px-8 md:pb-16 md:pt-28">
      <div className="mx-auto grid w-full min-w-0 max-w-[1400px] items-center gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="px-4 pt-8 md:px-0 md:pt-0">
          <p className="type-on-field mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e31b23]">
            drop 01 · live
          </p>
          <h1 className="type-on-field max-w-full text-[clamp(2.55rem,12.5vw,7.4rem)] font-extrabold leading-[0.86] tracking-[-0.05em] text-[#171411]">
            pop open.
          </h1>
          <p className="font-hand type-on-field mt-4 text-2xl text-[#9b2242] md:text-3xl">
            one hour off the algorithm.
          </p>
          <p className="type-on-field mt-4 max-w-sm text-base leading-snug text-[#5e574e]">
            puzzles in a can. 150 pieces. peel, snap, hang. pick a mood and add it to cart.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={goShop}
              className="rounded-full bg-[#e31b23] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#171411]"
            >
              Shop the drop
            </button>
            <p className="text-sm text-[#5e574e]">₹500 · ₹600 framed</p>
          </div>
        </div>

        <div className="relative min-w-0 overflow-hidden bg-[#efe8dc] sm:rounded-[1.4rem]">
          <Image
            src="/products/caprese-break.jpg"
            alt="piece/out caprese break puzzle can and frame"
            width={1024}
            height={991}
            preload
            loading="eager"
            fetchPriority="high"
            quality={90}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="h-auto w-full max-w-full"
          />
          <ProductPuzzle product={PRODUCTS[0]} />
        </div>
      </div>
    </section>
  );
}
