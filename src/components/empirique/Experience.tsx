"use client";

import { useEffect } from "react";
import { useLenisScroll } from "@/hooks/useLenisScroll";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { useMediaStore } from "@/store/mediaStore";
import { useChamberStore } from "@/store/chamberStore";
import { ScrollTrigger } from "@/lib/motion";
import { Atmosphere } from "./Atmosphere";
import { GoldCursor } from "./GoldCursor";
import { ScrollProgress } from "./ScrollProgress";
import { Intro } from "./Intro";
import { Nav } from "./Nav";
import { Chamber } from "./Chamber";
import { Statement } from "./Statement";
import { Gallery } from "./Gallery";
import { Waitlist } from "./Waitlist";
import { Footer, Marquee } from "./Chrome";

export function Empirique() {
  useMediaFlags();
  const ready = useMediaStore((state) => state.ready);
  const reduced = useMediaStore((state) => state.reducedMotion);
  const introDone = useChamberStore((state) => state.introDone);
  useLenisScroll(ready && introDone && !reduced);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      useChamberStore.getState().setPointer(x, y);
    };
    const onDown = () => useChamberStore.getState().nudgePulse();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useEffect(() => {
    if (reduced) useChamberStore.getState().setIntroDone();
  }, [reduced]);

  useEffect(() => {
    if (!introDone) return;
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [introDone]);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070506]">
        <p className="font-display text-sm tracking-[0.32em] text-[#A8845C]">EMPIRIQUE</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-transparent text-[#D4C4B0]">
      <Atmosphere />
      <GoldCursor />
      <ScrollProgress />
      {!reduced ? <Intro /> : null}
      <div className="relative z-10">
        <Nav />
        <Chamber />
        <Statement />
        <Marquee />
        <Gallery />
        <Waitlist />
        <Footer />
      </div>
    </main>
  );
}
