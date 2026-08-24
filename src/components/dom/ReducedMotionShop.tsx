"use client";

import { useShopStore } from "@/store/shopStore";
import { PUZZLES } from "@/data/puzzles";
import { Logo } from "@/components/brand/Logo";
import { FrameToggle } from "./FrameToggle";
import { CheckoutSheet } from "./CheckoutSheet";
import { formatInr, priceFor } from "@/lib/brand";
import { useScrollStore } from "@/store/scrollStore";

export function ReducedMotionShop() {
  const withFrame = useShopStore((s) => s.withFrame);
  const openCheckout = useShopStore((s) => s.openCheckout);
  const setChapter = useScrollStore((s) => s.setChapter);

  return (
    <main className="min-h-screen bg-[#F6D0DA] text-[#111111]">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Logo className="text-sm" />
        <FrameToggle compact />
      </header>
      <section className="px-6 pb-8 md:px-12">
        <h1 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight md:text-6xl">
          puzzles you can pop open
        </h1>
        <p className="mt-3 max-w-md text-[#6d4e57]">
          easy peel. fold & lock. hang or stand.
        </p>
      </section>
      <ul className="grid gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3 md:px-12">
        {PUZZLES.map((p, i) => (
          <li key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(80,30,40,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.art} alt={`${p.name} ${p.subtitle}`} className="aspect-square w-full object-cover" />
            <div className="p-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold">
                {p.name}
              </h2>
              <p className="text-sm text-[#6d4e57]">{p.subtitle}</p>
              <p className="mt-1 text-sm text-[#6d4e57]">{p.blurb}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-full bg-[#111111] py-3 text-sm font-semibold text-white hover:bg-[#E31B23]"
                onClick={() => {
                  setChapter(true, i, 1);
                  openCheckout();
                }}
              >
                Buy · {formatInr(priceFor(withFrame))}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <CheckoutSheet />
    </main>
  );
}
