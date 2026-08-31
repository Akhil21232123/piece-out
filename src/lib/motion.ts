"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollToPlugin, SplitText, CustomEase, DrawSVGPlugin);

CustomEase.create("silk", "0.16, 1, 0.3, 1");
CustomEase.create("into", "0.77, 0, 0.175, 1");

export { gsap, useGSAP, ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (prefersReducedMotion()) {
    el.scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }
  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement, vars?: { offset?: number; duration?: number }) => void } }).__lenis;
  if (lenis) {
    lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    return;
  }
  gsap.to(window, {
    duration: 1.35,
    ease: "into",
    scrollTo: { y: el, offsetY: 0 },
  });
}
