"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cartCount, useCartStore } from "@/store/cartStore";
import { PuzzlizeButton } from "./PuzzlizeButton";
import { Logo } from "@/components/brand/Logo";

export function Nav({ onCheckout }: { onCheckout: () => void }) {
  const count = useCartStore((state) => cartCount(state.lines));
  const [live, setLive] = useState(false);
  const path = usePathname();
  const home = path === "/";
  const bag = live ? count : 0;

  useEffect(() => {
    setLive(true);
  }, []);

  const go = (id: string) => {
    if (home) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = `/#${id}`;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 overflow-visible border-b border-[#171411]/8 bg-[#efe8dc]/92 md:bg-[#efe8dc]/58 md:backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center" aria-label="pieceout home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[#5e574e] md:flex">
          <button type="button" onClick={() => go("shop")} className="transition hover:text-[#171411]">
            products
          </button>
        </nav>
        {bag > 0 ? (
          <PuzzlizeButton
            onClick={onCheckout}
            className="shrink-0 whitespace-nowrap rounded-full bg-[#e31b23] px-3 py-2 text-[11px] font-extrabold text-white md:px-5 md:text-sm"
          >
            Checkout · {bag}
          </PuzzlizeButton>
        ) : (
          <button
            type="button"
            onClick={() => go("shop")}
            className="rounded-full bg-[#171411] px-4 py-2 text-xs font-extrabold text-[#fffaf3] transition duration-300 hover:scale-[1.04] hover:bg-[#e31b23] md:px-5 md:text-sm"
          >
            Shop
          </button>
        )}
      </div>
    </header>
  );
}
