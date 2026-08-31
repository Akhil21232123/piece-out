"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";
import { Gathering } from "./Gathering";

export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGEllipseElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const lockup = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const overlay = root.current;
      const word = mark.current;
      if (!overlay || !word || !line.current || !sub.current || !ring.current || !lockup.current) return;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.documentElement.classList.remove("is-locked");
        useChamberStore.getState().setIntroDone();
        requestAnimationFrame(() => ScrollTrigger.refresh());
      };

      if (prefersReducedMotion()) {
        gsap.set(overlay, { autoAlpha: 0 });
        finish();
        return;
      }

      document.documentElement.classList.add("is-locked");
      const failSafe = window.setTimeout(finish, 11000);
      const split = SplitText.create(word, { type: "chars", mask: "chars", charsClass: "cine-char" });
      const proxy = { t: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "silk" },
        onComplete: () => {
          window.clearTimeout(failSafe);
          finish();
        },
      });

      tl.set(overlay, { autoAlpha: 1 })
        .from(ring.current, { drawSVG: "0% 0%", duration: 1.1, ease: "into" })
        .fromTo(line.current, { scaleX: 0 }, { scaleX: 1, duration: 0.75, ease: "into" }, "-=0.55")
        .from(
          split.chars,
          { yPercent: 120, autoAlpha: 0, duration: 1.15, stagger: 0.032, ease: "silk" },
          "-=0.4",
        )
        .from(sub.current, { autoAlpha: 0, y: 10, duration: 0.65 }, "-=0.5")
        .to({}, { duration: 0.55 })
        .to(lockup.current, { autoAlpha: 0, y: -28, filter: "blur(8px)", duration: 0.9, ease: "into" })
        .to(ring.current, { autoAlpha: 0, scale: 1.12, duration: 0.8, ease: "into" }, "<")
        .to(
          proxy,
          {
            t: 1,
            duration: 4.4,
            ease: "none",
            onUpdate: () => {
              useChamberStore.getState().setGatherT(proxy.t);
              if (proxy.t > 0.72 && !useChamberStore.getState().objectRevealed) {
                useChamberStore.getState().setObjectRevealed();
              }
            },
          },
          "-=0.35",
        )
        .to(overlay, { autoAlpha: 0, duration: 1.15, ease: "into" }, "-=0.55")
        .set(overlay, { pointerEvents: "none" });

      return () => {
        window.clearTimeout(failSafe);
        document.documentElement.classList.remove("is-locked");
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#070506]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(74,14,31,0.58),transparent_62%)]" />
      <Gathering />
      <svg className="intro-ring" viewBox="0 0 400 220" fill="none">
        <ellipse
          ref={ring}
          cx="200"
          cy="110"
          rx="168"
          ry="78"
          stroke="#A8845C"
          strokeWidth="0.6"
        />
      </svg>
      <div ref={lockup} className="relative flex flex-col items-center px-6">
        <div
          ref={line}
          className="mb-7 h-px w-[min(42vw,220px)] origin-center bg-[#A8845C]"
        />
        <h1
          ref={mark}
          className="font-display cine-title overflow-hidden whitespace-nowrap text-[clamp(2.2rem,8.2vw,4.8rem)] font-medium tracking-[0.26em] text-[#D4C4B0]"
        >
          EMPIRIQUE
        </h1>
        <p
          ref={sub}
          className="mt-6 text-[10px] font-medium uppercase tracking-[0.48em] text-[#A8845C]"
        >
          The house
        </p>
      </div>
    </div>
  );
}
