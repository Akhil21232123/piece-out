"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRAND, formatInr } from "@/lib/brand";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const floatShotRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = shotRef.current;
      const copy = copyRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const coarse =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
      if (copy) {
        const line = copy.querySelector(".hero-line");
        const rest = [...copy.children].filter((el) => el.tagName !== "H1");
        if (line) {
          gsap.from(line, {
            yPercent: 108,
            duration: 1.05,
            ease: "power4.out",
          });
        }
        if (rest.length) {
          gsap.from(rest, {
            y: 18,
            autoAlpha: 0.2,
            duration: 0.85,
            stagger: 0.07,
            ease: "power3.out",
            delay: 0.12,
          });
        }
      }
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
      const floatShot = floatShotRef.current;
      if (floatShot) {
        gsap.to(floatShot, {
          y: coarse ? -6 : -10,
          duration: coarse ? 5.4 : 4.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { scope: rootRef },
  );

  const goShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section ref={rootRef} id="top" className="relative overflow-x-clip pt-16 md:px-8 md:pb-16 md:pt-28">
      <div className="mx-auto grid w-full min-w-0 max-w-[1400px] items-center gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div ref={copyRef} className="px-4 pt-8 md:px-0 md:pt-0">
          <p className="type-on-field mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e31b23]">
            pieceout · drop 01 · collection
          </p>
          <h1 className="type-on-field max-w-full overflow-hidden text-[clamp(2.55rem,12.5vw,7.4rem)] font-extrabold leading-[0.86] tracking-[-0.05em] text-[#171411]">
            <span className="hero-line inline-block">pop open.</span>
          </h1>
          <p className="font-hand type-on-field mt-4 text-2xl text-[#9b2242] md:text-3xl">
            one hour off the algorithm.
          </p>
          <p className="type-on-field mt-4 max-w-sm text-base leading-snug text-[#5e574e]">
            pieceout is a premium collection of puzzles in a can. {BRAND.pieces} pieces. peel, snap, hang.
            pick an edition and add it to cart.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={goShop}
              className="rounded-full bg-[#e31b23] px-7 py-3.5 text-sm font-extrabold text-white transition duration-300 hover:scale-[1.04] hover:bg-[#171411] active:scale-[0.97]"
            >
              Shop products
            </button>
            <p className="text-sm text-[#5e574e]">
              {formatInr(BRAND.priceBare)} · {formatInr(BRAND.priceFrame)} framed
            </p>
          </div>
        </div>

        <div
          ref={shotRef}
          className="hero-shot relative min-w-0 overflow-hidden bg-transparent sm:rounded-[1.4rem]"
        >
          <div ref={floatShotRef} className="will-change-transform">
            <Image
              src="/products/diet-coke-pop.jpg"
              alt="piece/out Diet Coke: peel the can, snap the frame, lock in 150 pieces, hang or stand"
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
      </div>
    </section>
  );
}
