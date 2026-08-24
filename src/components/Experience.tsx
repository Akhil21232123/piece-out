"use client";

import dynamic from "next/dynamic";
import { useLenisScroll } from "@/hooks/useLenisScroll";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useMediaStore } from "@/store/mediaStore";
import { ScrollOverlay } from "@/components/dom/ScrollOverlay";
import { NavBar } from "@/components/dom/NavBar";
import { CheckoutSheet } from "@/components/dom/CheckoutSheet";
import { ReducedMotionShop } from "@/components/dom/ReducedMotionShop";

const Scene = dynamic(() => import("@/components/canvas/Scene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-0 flex items-center justify-center bg-[#F6D0DA]">
        <p className="font-[family-name:var(--font-display)] text-sm text-[#6d4e57]">
          popping the can…
        </p>
    </div>
  ),
});

export function Experience() {
  useMediaFlags();
  const ready = useMediaStore((s) => s.ready);
  const reduced = useMediaStore((s) => s.reducedMotion);
  useLenisScroll(ready && !reduced);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6D0DA] text-[#6d4e57]">
        <p className="font-[family-name:var(--font-display)] text-sm">piece/out</p>
      </div>
    );
  }

  if (reduced) return <ReducedMotionShop />;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6D0DA]">
      <Scene />
      <NavBar />
      <ScrollOverlay />
      <CheckoutSheet />
    </main>
  );
}
