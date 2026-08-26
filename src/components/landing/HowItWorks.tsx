"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOW_IT_WORKS } from "@/data/products";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const panel = root.querySelector("[data-how-panel]");
      if (panel) {
        gsap.fromTo(
          panel,
          { y: 28 },
          {
            y: -16,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 95%",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      }
      gsap.from(root.querySelectorAll("[data-how-step]"), {
        autoAlpha: 0.28,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: root,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="how"
      className="relative scroll-mt-20 border-t border-[#171411]/10 px-4 py-16 md:px-8 md:py-24"
    >
      <div data-how-panel className="mx-auto max-w-[1400px] rounded-[1.4rem] bg-[#fffaf3]/80 px-4 py-8 md:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e31b23]">how</p>
        <h2 className="type-on-field mt-3 max-w-[14ch] text-[clamp(1.85rem,8vw,3.75rem)] font-extrabold tracking-tight text-[#171411]">
          peel. snap. lock in. flex.
        </h2>
        <p className="font-hand mt-3 text-2xl text-[#9b2242]">no 10-step ritual. just this.</p>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.id} className="how-step" data-how-step>
              <p className="text-xs font-semibold text-[#e31b23]">{step.n}</p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-[#171411]">{step.title}</h3>
              <p className="mt-2 text-sm text-[#7a7268]">{step.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
