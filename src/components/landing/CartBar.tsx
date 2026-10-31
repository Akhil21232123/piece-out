"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { cartCount, cartSubtotal, useCartStore } from "@/store/cartStore";
import { formatInr } from "@/lib/brand";
import { PuzzlizeButton } from "./PuzzlizeButton";

export function CartBar({
  onCheckout,
  hidden,
}: {
  onCheckout: () => void;
  hidden?: boolean;
}) {
  const bagRef = useRef<HTMLDivElement>(null);
  const lines = useCartStore((state) => state.lines);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  useEffect(() => {
    const onCatch = () => {
      const bag = bagRef.current;
      if (!bag) return;
      gsap
        .timeline({ overwrite: true })
        .fromTo(bag, { scale: 1 }, { scale: 1.1, duration: 0.14, ease: "back.out(3)" })
        .to(bag, { scale: 1, duration: 0.42, ease: "elastic.out(1, 0.55)" });
    };
    window.addEventListener("po-cart-catch", onCatch);
    window.addEventListener("po-cart-pulse", onCatch);
    return () => {
      window.removeEventListener("po-cart-catch", onCatch);
      window.removeEventListener("po-cart-pulse", onCatch);
    };
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && !hidden && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6"
        >
          <div
            ref={bagRef}
            data-cart-bag
            className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 overflow-visible rounded-full border border-[#171411]/10 bg-[#171411] px-3 py-2.5 shadow-[0_12px_40px_rgb(23_20_17_/_0.28)]"
          >
            <div className="pl-3 text-[#fffaf3]">
              <p className="text-sm font-extrabold">
                {count} {count === 1 ? "Product" : "Products"}
              </p>
              <p className="text-xs text-[#c8c0b4]">{formatInr(subtotal)}</p>
            </div>
            <PuzzlizeButton
              onClick={onCheckout}
              className="shrink-0 whitespace-nowrap rounded-full bg-[#f5c400] px-5 py-2.5 text-sm font-extrabold text-[#171411]"
            >
              Checkout
            </PuzzlizeButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
