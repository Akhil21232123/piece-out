"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion, scrollToId } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";

export function Nav() {
  const root = useRef<HTMLElement>(null);
  const introDone = useChamberStore((state) => state.introDone);

  useGSAP(
    () => {
      if (!root.current) return;
      if (!introDone) {
        gsap.set(root.current, { autoAlpha: 0 });
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(root.current, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        root.current,
        { autoAlpha: 0, y: -14 },
        { autoAlpha: 1, y: 0, duration: 1.15, ease: "silk" },
      );
    },
    { scope: root, dependencies: [introDone] },
  );

  return (
    <header ref={root} className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="pointer-events-auto mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10 md:py-7">
        <a
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            scrollToId("top");
          }}
          className="font-display text-[13px] tracking-[0.28em] text-[#E8DCC8] md:text-sm"
        >
          EMPIRIQUE
        </a>
        <nav className="flex items-center gap-6 text-[10px] font-medium uppercase tracking-[0.32em] text-[#A8845C] md:gap-10">
          <button type="button" onClick={() => scrollToId("unseen")} className="transition hover:text-[#D4C4B0]">
            Unseen
          </button>
          <button type="button" onClick={() => scrollToId("invitation")} className="transition hover:text-[#D4C4B0]">
            Invitation
          </button>
        </nav>
      </div>
    </header>
  );
}
