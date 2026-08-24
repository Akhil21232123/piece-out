"use client";

import { cartCount, useCartStore } from "@/store/cartStore";
import { PuzzlizeButton } from "./PuzzlizeButton";

export function Nav({ onCheckout }: { onCheckout: () => void }) {
  const count = useCartStore((state) => cartCount(state.lines));

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 overflow-visible border-b border-[#171411]/8 bg-[#efe8dc]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-8">
        <a href="#top" className="text-sm font-extrabold tracking-tight text-[#171411]">
          piece<span className="text-[#e31b23]">/</span>out
        </a>
        <nav className="hidden items-center gap-8 text-sm text-[#5e574e] md:flex">
          <button type="button" onClick={() => go("shop")} className="transition hover:text-[#171411]">
            the drop
          </button>
          <button type="button" onClick={() => go("how")} className="transition hover:text-[#171411]">
            how
          </button>
        </nav>
        {count > 0 ? (
          <PuzzlizeButton
            onClick={onCheckout}
            className="shrink-0 whitespace-nowrap rounded-full bg-[#e31b23] px-3 py-2 text-[11px] font-extrabold text-white md:px-5 md:text-sm"
          >
            Checkout · {count}
          </PuzzlizeButton>
        ) : (
          <button
            type="button"
            onClick={() => go("shop")}
            className="rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3] md:px-5 md:text-sm"
          >
            Shop
          </button>
        )}
      </div>
    </header>
  );
}
