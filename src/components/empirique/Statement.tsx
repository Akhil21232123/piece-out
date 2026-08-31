"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, prefersReducedMotion } from "@/lib/motion";

export function Statement() {
  const root = useRef<HTMLElement>(null);
  const rule = useRef<SVGLineElement>(null);
  const quote = useRef<HTMLParagraphElement>(null);
  const ghost = useRef<HTMLParagraphElement>(null);
  const aside = useRef<HTMLParagraphElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = quote.current;
      if (!q) return;

      gsap.from(kicker.current, {
        autoAlpha: 0,
        letterSpacing: "0.8em",
        duration: 1.2,
        ease: "silk",
        scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
      });

      if (rule.current) {
        gsap.from(rule.current, {
          drawSVG: 0,
          duration: 1.4,
          ease: "into",
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        });
      }

      SplitText.create(q, {
        type: "lines",
        mask: "lines",
        autoSplit: false,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            autoAlpha: 0,
            duration: 1.35,
            stagger: 0.12,
            ease: "silk",
            scrollTrigger: { trigger: q, start: "top 84%", once: true },
          });
        },
      });

      if (ghost.current) {
        gsap.fromTo(
          ghost.current,
          { autoAlpha: 0, scale: 0.92, filter: "blur(12px)" },
          {
            autoAlpha: 0.1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.8,
            ease: "silk",
            scrollTrigger: { trigger: ghost.current, start: "top 90%", once: true },
          },
        );
      }

      gsap.fromTo(
        aside.current,
        { autoAlpha: 0, y: 16, filter: "blur(8px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.3,
          ease: "silk",
          scrollTrigger: { trigger: aside.current, start: "top 92%", once: true },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="rule"
      className="emp-band relative flex min-h-[68dvh] flex-col items-center justify-center px-6 py-16 md:px-12"
    >
      <p ref={kicker} className="text-[10px] uppercase tracking-[0.5em] text-[#A8845C]">
        The rule
      </p>
      <svg className="mt-8 h-[1px] w-[min(42vw,180px)] overflow-visible" aria-hidden>
        <line ref={rule} x1="0" y1="0.5" x2="180" y2="0.5" stroke="#A8845C" strokeWidth="1" />
      </svg>
      <p
        ref={ghost}
        aria-hidden
        className="pointer-events-none absolute font-display text-[clamp(4rem,14vw,10rem)] italic tracking-[0.06em] text-[#6B0F2A]"
      >
        closed
      </p>
      <p
        ref={quote}
        className="font-display relative mt-12 max-w-4xl text-center text-[clamp(1.85rem,5vw,4.4rem)] font-medium italic leading-[1.12] text-[#E8DCC8]"
      >
        It arrives closed. It remains unseen until it is yours.
      </p>
      <p
        ref={aside}
        className="mt-10 max-w-sm text-center text-sm leading-relaxed tracking-[0.06em] text-[#8A7A6E]"
      >
        A private object. A closed room. A name spoken once.
      </p>
    </section>
  );
}
