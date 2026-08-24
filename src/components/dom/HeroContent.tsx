"use client";

import { useScrollStore } from "@/store/scrollStore";

export function HeroContent() {
  const heroScroll = useScrollStore((s) => s.heroScroll);
  const inCatalog = useScrollStore((s) => s.inCatalog);
  const opacity = inCatalog ? 0 : 1 - Math.min(1, heroScroll * 1.15);

  return (
    <div
      className="flex h-screen w-full flex-col justify-between px-6 pb-12 pt-24 md:px-14 md:pb-16 md:pt-28"
      style={{ opacity, transition: "opacity 0.15s linear" }}
    >
      <div className="max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.04] tracking-tight text-[#111111] md:text-6xl">
          puzzles you can pop open
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-[#6d4e57] md:text-lg">
          easy peel. pieces fly out. fold & lock the frame. hang or stand.
        </p>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-sm text-[#6d4e57]">drop 01 · diet coke pop art</p>
        <div className="hidden flex-col items-center gap-3 sm:flex">
          <span className="text-xs text-[#6d4e57]">scroll</span>
          <div className="scroll-indicator h-14 w-px bg-gradient-to-b from-[#111111] to-transparent" />
        </div>
      </div>
    </div>
  );
}
