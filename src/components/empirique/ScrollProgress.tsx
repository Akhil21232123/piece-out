"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/motion";

export function ScrollProgress() {
  const fill = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!fill.current || prefersReducedMotion()) return;
    gsap.fromTo(
      fill.current,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35,
        },
      },
    );
  });

  return (
    <div className="emp-rail" aria-hidden>
      <span ref={fill} className="emp-rail-fill" />
    </div>
  );
}
