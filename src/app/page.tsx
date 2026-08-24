"use client";

import { useCallback, useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Shop } from "@/components/landing/Shop";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CheckoutModal } from "@/components/landing/CheckoutModal";
import { CartBar } from "@/components/landing/CartBar";
import { Footer, Marquee } from "@/components/landing/Chrome";
import { PuzzleField } from "@/components/landing/PuzzleField";
import { PuzzlePlay } from "@/components/landing/PuzzlePlay";
import { FitPhone } from "@/components/landing/FitPhone";
import { cartCount, useCartStore } from "@/store/cartStore";

export default function Home() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const count = useCartStore((state) => cartCount(state.lines));
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const openCheckout = useCallback(() => {
    if (cartCount(useCartStore.getState().lines) > 0) setCheckoutOpen(true);
  }, []);

  return (
    <main className={`relative min-h-dvh overflow-x-clip bg-transparent text-[#171411] ${count > 0 ? "pb-36" : ""}`}>
      <FitPhone />
      <div className="puzzle-paper" aria-hidden />
      <PuzzleField />
      <div className="site-grain" aria-hidden />
      <PuzzlePlay />
      <div className="relative z-10">
        <Nav onCheckout={openCheckout} />
        <Hero />
        <Marquee />
        <Shop />
        <HowItWorks />
        <Footer />
      </div>
      <CartBar onCheckout={openCheckout} hidden={checkoutOpen} />
      <CheckoutModal open={checkoutOpen} onClose={closeCheckout} />
    </main>
  );
}
