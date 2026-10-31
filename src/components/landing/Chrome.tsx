"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DealPrice } from "@/components/brand/DealPrice";
import { Logo } from "@/components/brand/Logo";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Marquee() {
  const line = "pop it  ·  lock in  ·  150 pieces  ·  1 hour  ·  hang it  ·  ";
  return (
    <div className="overflow-hidden border-y border-[#171411]/10 bg-[#f5c400] py-3 text-[#171411]" suppressHydrationWarning>
      <div className="flex w-max animate-marquee">
        <p className="whitespace-nowrap px-4 text-sm font-extrabold uppercase tracking-[0.22em]">
          {line.repeat(8)}
        </p>
        <p className="whitespace-nowrap px-4 text-sm font-extrabold uppercase tracking-[0.22em]" aria-hidden>
          {line.repeat(8)}
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(root.querySelectorAll("[data-foot]"), {
        y: 18,
        autoAlpha: 0.2,
        duration: 0.85,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: root,
          start: "top 90%",
          once: true,
        },
      });
    },
    { scope: rootRef },
  );

  return (
    <footer ref={rootRef} className="border-t border-[#171411]/10 px-4 py-16 pb-32 md:px-8 md:pb-16">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div data-foot>
            <Logo size={56} className="mb-4 [&_img]:h-14 [&_img]:w-14" />
          </div>
          <p data-foot className="type-on-field text-5xl font-extrabold tracking-tight text-[#171411]">
            piece<span className="text-[#e31b23]">/</span>out
          </p>
          <p data-foot className="font-hand type-on-field mt-3 text-2xl text-[#9b2242]">
            puzzles you can pop open.
          </p>
          <p data-foot className="type-on-field mt-2 max-w-xs text-sm text-[#7a7268]">
            one hour of you. then hang it.
          </p>
        </div>
        <p data-foot className="text-sm text-[#7a7268]">
          <span className="flex flex-wrap items-end justify-start gap-3 md:justify-end">
            <DealPrice withFrame={false} compact />
            <span className="flex items-baseline gap-1">
              framed
              <DealPrice withFrame compact />
            </span>
          </span>
        </p>
      </div>
    </footer>
  );
}
