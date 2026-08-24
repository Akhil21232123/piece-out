"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollStore } from "@/store/scrollStore";
import { STAGES } from "@/types/scroll";
import { HeroContent } from "./HeroContent";
import { ProductCTA } from "./ProductCTA";
import { PUZZLES } from "@/data/puzzles";
import { CHAPTER_VH } from "@/lib/brand";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function ScrollOverlay() {
  const heroRef = useRef<HTMLElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const setChapter = useScrollStore((s) => s.setChapter);
  const setHeroScroll = useScrollStore((s) => s.setHeroScroll);
  const stage = useScrollStore((s) => s.stage);

  useGSAP(
    () => {
      const hero = heroRef.current;
      const catalog = catalogRef.current;
      if (!hero || !catalog) return;

      const heroTrigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => setHeroScroll(self.progress),
        onLeaveBack: () => setHeroScroll(0),
      });

      const catalogTrigger = ScrollTrigger.create({
        trigger: catalog,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.55,
        onUpdate: (self) => {
          const n = PUZZLES.length;
          const raw = self.progress * n;
          const index = Math.min(n - 1, Math.floor(raw + 1e-6));
          const local = Math.min(1, raw - index);
          setChapter(true, index, local);
        },
        onLeaveBack: () => setChapter(false, 0, 0),
        onEnter: () => setChapter(true, 0, 0),
      });

      return () => {
        heroTrigger.kill();
        catalogTrigger.kill();
      };
    },
    { dependencies: [] },
  );

  return (
    <div className="relative z-10">
      <section id="top" ref={heroRef} className="pointer-events-none h-screen">
        <HeroContent />
      </section>

      <div
        ref={catalogRef}
        className="relative"
        style={{ height: `${PUZZLES.length * CHAPTER_VH * 100}vh` }}
      >
        <div className="sticky top-0 flex h-screen w-full flex-col justify-between pointer-events-none">
          <div />

          <div
            className="absolute bottom-28 left-6 hidden flex-col gap-3 md:flex"
            aria-hidden
          >
            {STAGES.map((s) => (
              <div
                key={s.id}
                data-stage={s.id}
                className={`stage-label text-[12px] lowercase text-[#111111]/25 transition-colors duration-300 ${
                  stage === s.id ? "is-active" : ""
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>

          <ProductCTA />
        </div>
      </div>
    </div>
  );
}
