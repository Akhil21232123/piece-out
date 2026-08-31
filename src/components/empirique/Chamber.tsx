"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";
import { Coffret } from "./Coffret";

export function Chamber() {
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const whisper = useChamberStore((state) => state.whisper);
  const introDone = useChamberStore((state) => state.introDone);

  useGSAP(
    () => {
      const frame = view.current;
      if (!frame || !introDone) return;

      if (prefersReducedMotion()) {
        ScrollTrigger.create({
          trigger: frame,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => useChamberStore.getState().setProgress(self.progress),
        });
        return;
      }

      if (title.current) {
        SplitText.create(title.current, {
          type: "chars",
          mask: "chars",
          charsClass: "cine-char",
          onSplit(self) {
            return gsap.from(self.chars, {
              yPercent: 110,
              autoAlpha: 0,
              duration: 1.2,
              stagger: 0.028,
              ease: "silk",
            });
          },
        });
      }

      gsap.from(kicker.current, { autoAlpha: 0, y: 10, duration: 1, delay: 0.08, ease: "silk" });
      if (line.current) {
        gsap.fromTo(
          line.current,
          { autoAlpha: 0, y: 16, filter: "blur(10px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.55, delay: 0.22, ease: "silk" },
        );
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: frame,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 0.52)}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          fastScrollEnd: true,
          scrub: 0.62,
          invalidateOnRefresh: true,
          onUpdate: (self) => useChamberStore.getState().setProgress(self.progress),
        },
      });

      tl.to(copy.current, { autoAlpha: 0, y: -16, duration: 0.2 }, 0);
      const shaft = document.querySelector(".emp-shaft");
      if (shaft) tl.to(shaft, { opacity: 0, duration: 0.16 }, 0.08);
    },
    { scope: root, dependencies: [introDone], revertOnUpdate: true },
  );

  return (
    <section id="top" ref={root} className="emp-band relative">
      <div ref={view} className="chamber-view">
        <Coffret />
        <div
          ref={copy}
          className="pointer-events-none relative z-10 flex h-full flex-col items-center px-6 pb-10 pt-20"
        >
          <p
            ref={kicker}
            className="text-[10px] font-medium uppercase tracking-[0.52em] text-[#A8845C]"
          >
            Issue 01
          </p>
          <div className="flex-1" />
          {whisper ? (
            <p className="mb-4 font-display text-sm italic tracking-[0.22em] text-[#A8845C]">{whisper}</p>
          ) : null}
          <h1
            ref={title}
            className="font-display cine-title text-[clamp(1.45rem,3.8vw,2.55rem)] font-medium tracking-[0.28em] text-[#D4C4B0]"
          >
            EMPIRIQUE
          </h1>
          <p
            ref={line}
            className="font-display mt-3 max-w-md text-center text-[1.05rem] italic leading-snug text-[#C4B4A0] md:text-xl"
          >
            Some things aren’t meant to be seen. Only felt.
          </p>
        </div>
      </div>
    </section>
  );
}
