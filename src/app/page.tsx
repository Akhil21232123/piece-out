"use client";

import { useCallback, useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Shop } from "@/components/landing/Shop";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CheckoutModal } from "@/components/landing/CheckoutModal";
import { CartBar } from "@/components/landing/CartBar";
import { Footer, Marquee } from "@/components/landing/Chrome";
import { PuzzleField } from "@/components/landing/PuzzleField";
import { FitPhone } from "@/components/landing/FitPhone";
import { cartCount, useCartStore } from "@/store/cartStore";
import { PausedBanner } from "@/components/landing/PausedBanner";
import { useOrdersPaused } from "@/store/siteStatus";

export default function Home() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const count = useCartStore((state) => cartCount(state.lines));
  const paused = useOrdersPaused();
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const openCheckout = useCallback(() => {
    if (!paused && cartCount(useCartStore.getState().lines) > 0) setCheckoutOpen(true);
  }, [paused]);

  return (
    <main className={`relative min-h-dvh overflow-x-hidden bg-transparent text-[#171411] ${count > 0 ? "pb-36" : ""}`}>
      <div className="paper-drift" aria-hidden />
      <FitPhone />
      <PuzzleField />
      <PausedBanner />
      <div className="relative z-10 isolate">
        <Nav onCheckout={openCheckout} />
        <HowItWorks />
        <Marquee />
        <Shop />
        <Footer />
      </div>
      <CartBar onCheckout={openCheckout} hidden={checkoutOpen || paused} />
      <CheckoutModal open={checkoutOpen} onClose={closeCheckout} />
    </main>
  );
}
