"use client";

import { Logo } from "@/components/brand/Logo";
import { FrameToggle } from "./FrameToggle";
import { useScrollStore } from "@/store/scrollStore";
import { useShopStore } from "@/store/shopStore";
import { getPuzzle, PUZZLES } from "@/data/puzzles";
import { getLenis } from "@/hooks/useLenisScroll";
import { CHAPTER_VH } from "@/lib/brand";

export function NavBar() {
  const inCatalog = useScrollStore((s) => s.inCatalog);
  const chapterIndex = useScrollStore((s) => s.chapterIndex);
  const openCheckout = useShopStore((s) => s.openCheckout);
  const puzzle = getPuzzle(chapterIndex);

  const jumpTo = (index: number) => {
    const y = window.innerHeight + index * window.innerHeight * CHAPTER_VH + 8;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-4 md:px-8">
      <a
        href="#top"
        className="pointer-events-auto text-[#111111]"
        aria-label="piece/out home"
        onClick={(e) => {
          e.preventDefault();
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(0, { duration: 0.9 });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <Logo className="text-sm md:text-base" />
      </a>

      {inCatalog && (
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center justify-center gap-3">
          <p className="hidden truncate font-[family-name:var(--font-display)] text-sm font-bold text-[#111111] md:block">
            {puzzle.name} {puzzle.subtitle}
          </p>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-3">
        {inCatalog && (
          <>
            <div className="hidden lg:block">
              <FrameToggle compact />
            </div>
            <button
              type="button"
              onClick={openCheckout}
              className="rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E31B23]"
            >
              Buy
            </button>
          </>
        )}
      </div>

      {inCatalog && PUZZLES.length > 1 && (
        <nav
          className="pointer-events-auto absolute left-1/2 top-[4.4rem] hidden -translate-x-1/2 gap-1.5 md:flex"
          aria-label="Puzzle catalog"
        >
          {PUZZLES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={p.name}
              aria-current={i === chapterIndex ? "true" : undefined}
              onClick={() => jumpTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === chapterIndex ? "w-6 bg-[#111111]" : "w-1.5 bg-[#111111]/20 hover:bg-[#111111]/45"
              }`}
            />
          ))}
        </nav>
      )}
    </header>
  );
}
