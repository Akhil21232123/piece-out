"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, prefersReducedMotion } from "@/lib/motion";

const PANELS = [
  {
    num: "01",
    title: "The hour",
    body: "After midnight, when the rooms are empty and the drapes remember every guest who did not stay.",
  },
  {
    num: "02",
    title: "The cloth",
    body: "Velvet keeps its secrets. The box is not packaging. It is the last door.",
  },
  {
    num: "03",
    title: "The name",
    body: "Empirique — known only by those already inside. The rest may wait.",
  },
];

export function Gallery() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section || prefersReducedMotion()) return;

      gsap.utils.toArray<HTMLElement>(".gallery-panel", section).forEach((panel) => {
        const title = panel.querySelector(".gallery-title");
        if (title) {
          SplitText.create(title, {
            type: "chars",
            mask: "chars",
            charsClass: "cine-char",
            onSplit(self) {
              return gsap.from(self.chars, {
                yPercent: 110,
                autoAlpha: 0,
                stagger: 0.022,
                duration: 1.1,
                ease: "silk",
                scrollTrigger: { trigger: panel, start: "top 78%", once: true },
              });
            },
          });
        }
        gsap.fromTo(
          panel.querySelector(".gallery-copy"),
          { autoAlpha: 0, y: 18, filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.05,
            ease: "silk",
            scrollTrigger: { trigger: panel, start: "top 76%", once: true },
          },
        );
        gsap.from(panel.querySelector(".gold-rule"), {
          scaleX: 0,
          duration: 1,
          ease: "into",
          scrollTrigger: { trigger: panel, start: "top 78%", once: true },
        });
        gsap.from(panel.querySelector(".gallery-num"), {
          autoAlpha: 0,
          x: -48,
          duration: 1.35,
          ease: "silk",
          scrollTrigger: { trigger: panel, start: "top 82%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="unseen" ref={root} className="gallery emp-band">
      <div className="gallery-track">
        {PANELS.map((panel) => (
          <article key={panel.num} className="gallery-panel">
            <p className="gallery-num" aria-hidden>
              {panel.num}
            </p>
            <div className="gallery-copy-wrap">
              <p className="text-[10px] uppercase tracking-[0.46em] text-[#A8845C]">{panel.num}</p>
              <h2 className="gallery-title font-display mt-5 text-[clamp(2.6rem,6.4vw,6.2rem)] font-medium italic leading-[0.95] tracking-wide text-[#E8DCC8]">
                {panel.title}
              </h2>
              <div className="gold-rule mt-8 origin-left" />
              <p className="gallery-copy mt-8 max-w-md text-sm leading-relaxed tracking-wide text-[#8A7A6E] md:text-base">
                {panel.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
