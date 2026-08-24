"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cartCount, cartTotal, useCartStore } from "@/store/cartStore";
import { formatInr } from "@/lib/brand";
import { PuzzlizeButton } from "./PuzzlizeButton";

export function CartBar({
  onCheckout,
  hidden,
}: {
  onCheckout: () => void;
  hidden?: boolean;
}) {
  const lines = useCartStore((state) => state.lines);
  const count = cartCount(lines);
  const total = cartTotal(lines);

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
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 overflow-visible rounded-full border border-[#171411]/10 bg-[#171411] px-3 py-2.5 shadow-[0_12px_40px_rgb(23_20_17_/_0.28)]">
            <div className="pl-3 text-[#fffaf3]">
              <p className="text-sm font-extrabold">
                {count} {count === 1 ? "puzzle" : "puzzles"}
              </p>
              <p className="text-xs text-[#c8c0b4]">{formatInr(total)}</p>
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
