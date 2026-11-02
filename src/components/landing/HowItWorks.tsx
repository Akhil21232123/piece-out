"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BRAND } from "@/lib/brand";
import { DealPrice } from "@/components/brand/DealPrice";
import { FreeShipping } from "@/components/brand/FreeShipping";
import { FREE_SHIPPING, PUZZLE_REWARD } from "@/lib/brand";
import Link from "next/link";
import Image from "next/image";

gsap.registerPlugin(useGSAP);

const WORDS = ["peel.", "snap.", "lock in.", "flex."] as const;

export function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const word = wordRef.current;
      if (!root || !word) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(word, { yPercent: 0, autoAlpha: 1 });
        gsap.set(root.querySelectorAll("[data-how-in]"), { autoAlpha: 1, y: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const coarse =
          window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
        if (coarse) {
          gsap.set(word, { yPercent: 0, autoAlpha: 1 });
          gsap.set(root.querySelectorAll("[data-how-in]"), { autoAlpha: 1, y: 0 });
          return;
        }
        const intro = root.querySelectorAll("[data-how-in]");
        const pulse = root.querySelector(".how-cta-pulse");

        gsap.set(word, { yPercent: 0, autoAlpha: 1 });
        if (intro.length) {
          gsap.set(intro, { autoAlpha: 1, y: 0 });
          gsap.fromTo(
            intro,
            { y: 28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.85, stagger: 0.08, ease: "power4.out", immediateRender: false },
          );
        }
        gsap.fromTo(
          word,
          { yPercent: 118, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1, ease: "power4.out", immediateRender: false, delay: 0.2 },
        );

        if (pulse && window.matchMedia("(hover: hover)").matches) {
          gsap.to(pulse, {
            scale: 1.03,
            duration: 1.8,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 1.2,
          });
        }

        if (!coarse) {
          let index = 0;
          const cycle = gsap.timeline({ repeat: -1, delay: 1.6 });
          cycle.to({}, { duration: 1.85 });
          cycle.to(word, { yPercent: -110, autoAlpha: 0, duration: 0.36, ease: "power3.in" });
          cycle.call(() => {
            index = (index + 1) % WORDS.length;
            word.textContent = WORDS[index];
          });
          cycle.fromTo(
            word,
            { yPercent: 110, autoAlpha: 0 },
            { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power4.out", immediateRender: false },
          );
        }

        const cta = pulse as HTMLElement | null;
        if (cta && window.matchMedia("(hover: hover)").matches) {
          const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);
          const cxTo = gsap.quickTo(cta, "x", { duration: 0.45, ease: "power3.out" });
          const cyTo = gsap.quickTo(cta, "y", { duration: 0.45, ease: "power3.out" });
          const onCta = safe((e: PointerEvent) => {
            const box = cta.getBoundingClientRect();
            cxTo(gsap.utils.clamp(-8, 8, (e.clientX - box.left - box.width / 2) * 0.22));
            cyTo(gsap.utils.clamp(-6, 6, (e.clientY - box.top - box.height / 2) * 0.22));
          });
          const offCta = safe(() => {
            cxTo(0);
            cyTo(0);
          });
          cta.addEventListener("pointermove", onCta);
          cta.addEventListener("pointerleave", offCta);
          return () => {
            cta.removeEventListener("pointermove", onCta);
            cta.removeEventListener("pointerleave", offCta);
          };
        }
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const goShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative overflow-x-clip px-4 pb-16 pt-24 md:px-8 md:pb-28 md:pt-32"
    >
      <div className="mx-auto grid max-w-[1400px] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
        <div>
          <p data-how-in className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e31b23]">
            limited drop · {BRAND.pieces} pieces
          </p>
          <h1 className="type-on-field mt-4 font-extrabold tracking-[-0.045em] text-[#171411]">
            <span data-how-in className="block text-[clamp(2.7rem,9vw,5.4rem)] leading-[0.88]">
              pop the can.
            </span>
            <span className="mt-1 flex min-h-[1.05em] items-end overflow-hidden text-[clamp(2.7rem,9vw,5.4rem)] leading-[0.88]">
              <span ref={wordRef} className="inline-block will-change-transform">
                peel.
              </span>
            </span>
          </h1>
          <p data-how-in className="font-hand mt-4 text-[1.7rem] leading-none text-[#9b2242] md:text-3xl">
            no box. one hour. then hang it.
          </p>
          <p data-how-in className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-[#5e574e]">
            Premium puzzles in a can. Peel the lid, snap the frame, lock 150 pieces, hang it.
            Grab an edition — or the Mystery Puzzle.
          </p>
          <div data-how-in className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goShop}
              className="how-cta-pulse inline-flex min-h-12 items-center rounded-full bg-[#e31b23] px-6 text-sm font-extrabold text-white transition hover:bg-[#171411]"
            >
              Shop the drop
            </button>
            <Link
              href="/play"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#171411]/16 bg-[#fffaf3] px-5 text-sm font-extrabold text-[#171411] transition hover:border-[#171411]/40 lg:hidden"
            >
              <PieceMark />
              solve it · {PUZZLE_REWARD.percent}% off
            </Link>
          </div>
          <p data-how-in className="mt-4 text-sm text-[#5e574e]">
            <span className="flex flex-wrap items-end gap-3">
              <DealPrice withFrame={false} compact className="items-baseline text-[#171411]" />
              <span className="flex items-baseline gap-1 text-[#7a7268]">
                framed
                <DealPrice withFrame compact className="items-baseline" />
              </span>
            </span>
            {FREE_SHIPPING ? (
              <FreeShipping className="mt-2" />
            ) : (
              <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-[#7a7268]">
                ships with Delhivery
              </span>
            )}
          </p>
        </div>
        <PlayTeaser />
      </div>
    </section>
  );
}

function PieceMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M9 3h3.2a2.4 2.4 0 1 1 4.6 0H21v4.6a2.4 2.4 0 1 1 0 4.6V17h-4.2a2.4 2.4 0 1 0-4.6 0H9v-4.2a2.4 2.4 0 1 1 0-4.6z" />
    </svg>
  );
}

/** Desktop hero card that sends people to the /play game (the game itself lives on /play). */
function PlayTeaser() {
  return (
    <Link
      href="/play"
      data-how-in
      aria-label={`Play the can game and get ${PUZZLE_REWARD.percent}% off`}
      className="group relative mx-auto hidden w-full max-w-[34rem] overflow-hidden rounded-[1.6rem] bg-[#171411] shadow-[0_24px_60px_rgb(23_20_17_/_0.22)] lg:block"
    >
      <div className="relative aspect-[5/4]">
        <Image
          src="/products/diet-coke-puzzle.jpg"
          alt=""
          fill
          sizes="34rem"
          className="object-cover object-[50%_35%] opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 250 243 / 0.28) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 250 243 / 0.28) 1px, transparent 1px)",
            backgroundSize: "33.333% 25%",
          }}
        />
        <PieceMark className="absolute right-[12%] top-[10%] h-28 w-28 rotate-12 text-[#f5c400] drop-shadow-[0_14px_24px_rgb(23_20_17_/_0.45)] transition duration-500 group-hover:rotate-0 group-hover:scale-110" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#171411] via-[#171411]/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f5c400]">the can game</p>
          <p className="mt-1 text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[#fffaf3]">
            solve it. get {PUZZLE_REWARD.percent}% off.
          </p>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f5c400] px-5 text-sm font-extrabold text-[#171411] transition group-hover:bg-[#fffaf3]">
            <PieceMark />
            Play the puzzle
          </span>
        </div>
      </div>
    </Link>
  );
}
