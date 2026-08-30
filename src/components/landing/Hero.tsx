"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRAND, formatInr } from "@/lib/brand";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Hero() {
  const shotRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = shotRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const coarse =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
      gsap.fromTo(
        el,
        { y: 0, scale: 1 },
        {
          y: coarse ? 36 : 20,
          scale: coarse ? 0.95 : 0.975,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top 30%",
            end: "bottom top",
            scrub: 0.5,
          },
        },
      );
    },
    { scope: shotRef },
  );

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
            puzzles in a can. {BRAND.pieces} pieces. peel, snap, hang. pick a mood and add it to cart.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={goShop}
              className="rounded-full bg-[#e31b23] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#171411]"
            >
              Shop the drop
            </button>
            <p className="text-sm text-[#5e574e]">
              {formatInr(BRAND.priceBare)} · {formatInr(BRAND.priceFrame)} framed
            </p>
          </div>
        </div>

        <div
          ref={shotRef}
          className="hero-shot relative min-w-0 overflow-hidden bg-[#efe8dc] sm:rounded-[1.4rem]"
        >
          <Image
            src="/products/diet-coke.jpg"
            alt="piece/out diet coke: peel the can, snap the frame, lock in 120 pieces, hang or stand"
            width={1024}
            height={990}
            preload
            loading="eager"
            fetchPriority="high"
            quality={100}
            unoptimized
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full max-w-full"
          />
        </div>
      </div>
    </section>
  );
}
