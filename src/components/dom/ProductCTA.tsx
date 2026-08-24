"use client";

import { useScrollStore } from "@/store/scrollStore";
import { useShopStore } from "@/store/shopStore";
import { getPuzzle } from "@/data/puzzles";
import { FrameToggle } from "./FrameToggle";
import { formatInr, priceFor } from "@/lib/brand";

export function ProductCTA() {
  const ctaVisible = useScrollStore((s) => s.ctaVisible);
  const wallLock = useScrollStore((s) => s.wallLock);
  const chapterIndex = useScrollStore((s) => s.chapterIndex);
  const withFrame = useShopStore((s) => s.withFrame);
  const openCheckout = useShopStore((s) => s.openCheckout);
  const puzzle = getPuzzle(chapterIndex);

  const opacity = Math.min(1, Math.max(0, (wallLock - 0.05) / 0.5));
  const translateY = (1 - opacity) * 28;

  if (!ctaVisible && opacity < 0.01) {
    return <div className="h-0 w-full" aria-hidden />;
  }

  return (
    <div
      className="pointer-events-none flex w-full justify-end px-4 pb-8 md:px-10 md:pb-12"
      style={{
        opacity: ctaVisible ? opacity : 0,
        transform: `translateY(${ctaVisible ? translateY : 40}px)`,
        transition: "opacity 0.35s ease, transform 0.45s ease",
      }}
    >
      <aside className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#111111]/8 bg-white/85 p-6 shadow-[0_18px_50px_rgba(80,30,40,0.12)] backdrop-blur-md md:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-[#E31B23]">
          hang or stand
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[#111111]">
          {puzzle.name}
        </h3>
        <p className="text-sm text-[#6d4e57]">{puzzle.subtitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#6d4e57]">{puzzle.blurb}</p>

        <div className="mt-5">
          <FrameToggle />
        </div>

        <p className="mt-2 text-[12px] text-[#8a6a72]">
          {withFrame ? "pink fold & lock frame included" : "print only — add a frame anytime"}
        </p>

        <button
          type="button"
          onClick={openCheckout}
          className="mt-5 w-full rounded-full bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#E31B23]"
        >
          Buy · {formatInr(priceFor(withFrame))}
        </button>
      </aside>
    </div>
  );
}
