"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useLenisScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      lerp: 0.088,
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 1.05,
      autoRaf: false,
    });

    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("resize", refresh);
    const fontsReady = document.fonts?.ready.then(refresh);
    requestAnimationFrame(() => requestAnimationFrame(refresh));

    return () => {
      window.removeEventListener("resize", refresh);
      void fontsReady;
      gsap.ticker.remove(tickerCallback);
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, [enabled]);
}

export function getLenis(): Lenis | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __lenis?: Lenis }).__lenis;
}
