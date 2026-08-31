"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useChamberStore } from "@/store/chamberStore";

const TRAIL = 5;

export function GoldCursor() {
  const fine = useFinePointer();
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const trails = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!fine) return;
    const html = document.documentElement;
    html.classList.add("has-gold-cursor");
    const dotEl = dot.current;
    const ringEl = ring.current;
    if (!dotEl || !ringEl) return;

    const xDot = gsap.quickTo(dotEl, "x", { duration: 0.14, ease: "power3" });
    const yDot = gsap.quickTo(dotEl, "y", { duration: 0.14, ease: "power3" });
    const xRing = gsap.quickTo(ringEl, "x", { duration: 0.48, ease: "power3" });
    const yRing = gsap.quickTo(ringEl, "y", { duration: 0.48, ease: "power3" });
    gsap.set([dotEl, ringEl, ...trails.current], { x: -80, y: -80 });
    const trailMovers = trails.current.map((el, i) => {
      if (!el) return null;
      return {
        x: gsap.quickTo(el, "x", { duration: 0.32 + i * 0.11, ease: "power3" }),
        y: gsap.quickTo(el, "y", { duration: 0.32 + i * 0.11, ease: "power3" }),
      };
    });

    const move = (event: PointerEvent) => {
      xDot(event.clientX);
      yDot(event.clientY);
      xRing(event.clientX);
      yRing(event.clientY);
      for (const mover of trailMovers) {
        mover?.x(event.clientX);
        mover?.y(event.clientY);
      }
    };

    const hot = (on: boolean) => {
      dotEl.classList.toggle("is-hot", on);
      ringEl.classList.toggle("is-hot", on);
    };

    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest("a, button, input, textarea, label, [data-cursor='hot']"),
      );
      hot(interactive || useChamberStore.getState().hoveringBox);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    return () => {
      html.classList.remove("has-gold-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <>
      {Array.from({ length: TRAIL }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            trails.current[i] = el;
          }}
          className="emp-cursor-trail"
          style={{ opacity: 0.22 - i * 0.03 }}
        />
      ))}
      <div ref={dot} className="emp-cursor" />
      <div ref={ring} className="emp-cursor-ring" />
    </>
  );
}
