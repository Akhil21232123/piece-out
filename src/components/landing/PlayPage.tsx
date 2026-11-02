"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Nav } from "@/components/landing/Nav";
import { HeroPlay } from "@/components/landing/HeroPlay";
import { CartBar } from "@/components/landing/CartBar";
import { CheckoutModal } from "@/components/landing/CheckoutModal";
import { Footer } from "@/components/landing/Chrome";
import { PuzzleField } from "@/components/landing/PuzzleField";
import { PUZZLE_REWARD } from "@/lib/brand";
import { cartCount, useCartStore } from "@/store/cartStore";
import { useRewardStore } from "@/store/rewardStore";

export function PlayPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const count = useCartStore((state) => cartCount(state.lines));
  const unlocked = useRewardStore((state) => state.unlocked);
  const unlock = useRewardStore((state) => state.unlock);
  const hydrate = useRewardStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onSolved = useCallback(() => {
    const first = !useRewardStore.getState().unlocked;
    unlock();
    if (first && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#e31b23", "#f5c400", "#171411", "#fffaf3"],
      });
    }
  }, [unlock]);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const openCheckout = useCallback(() => {
    if (cartCount(useCartStore.getState().lines) > 0) setCheckoutOpen(true);
  }, []);

  return (
    <main className={`relative min-h-dvh overflow-x-hidden bg-transparent text-[#171411] ${count > 0 ? "pb-36" : ""}`}>
      <div className="paper-drift" aria-hidden />
      <PuzzleField />
      <div className="relative z-10 isolate">
        <Nav onCheckout={openCheckout} />
        <section className="relative overflow-x-clip px-4 pb-16 pt-24 md:px-8 md:pb-28 md:pt-32">
          <div className="mx-auto grid max-w-[1400px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#e31b23]">
                the can game · {PUZZLE_REWARD.percent}% off
              </p>
              <h1 className="type-on-field mt-3 text-[clamp(2.5rem,9vw,5.4rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-[#171411]">
                solve the can.
              </h1>
              <p className="font-hand mt-3 text-[1.6rem] leading-none text-[#9b2242] md:text-3xl">
                12 pieces. drag them home.
              </p>
              <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-[#5e574e]">
                Finish the Diet Coke puzzle and we take {PUZZLE_REWARD.percent}% off your order. No code to
                copy, it applies on its own at checkout.
              </p>

              <div aria-live="polite">
                {unlocked ? (
                  <div className="mt-6 max-w-md rounded-[1.25rem] bg-[#171411] px-5 py-4 text-[#fffaf3]">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#f5c400]">
                      solved
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight">
                      {PUZZLE_REWARD.percent}% off unlocked.
                    </p>
                    <p className="mt-1 text-sm text-[#c8c0b4]">
                      Applied automatically at checkout on your next order.
                    </p>
                    <Link
                      href="/#shop"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#f5c400] px-5 text-sm font-extrabold text-[#171411] transition hover:bg-[#fffaf3]"
                    >
                      Shop with {PUZZLE_REWARD.percent}% off
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href="/#shop"
                      className="inline-flex min-h-11 items-center rounded-full border border-[#171411]/16 bg-[#fffaf3] px-5 text-sm font-extrabold text-[#171411] transition hover:border-[#171411]/40"
                    >
                      Skip to the shop
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <HeroPlay onSolved={onSolved} />
          </div>
        </section>
        <Footer />
      </div>
      <CartBar onCheckout={openCheckout} hidden={checkoutOpen} />
      <CheckoutModal open={checkoutOpen} onClose={closeCheckout} />
    </main>
  );
}
