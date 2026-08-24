"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const FILLS = ["#d8ff3e", "#ff4fa3", "#f3eee6", "#d8ff3e", "#ff4fa3"];
const POOL = 12;
const PER_TAP = 5;

function Jig({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden>
      <path
        d="M26 8h10c0 7 10 7 10 0h10v10c7 0 7 10 0 10v10H46c0-7-10-7-10 0H26V28c-7 0-7-10 0-10V8Z"
        fill={fill}
      />
    </svg>
  );
}

export function PuzzleBurst() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);
      const pool = gsap.utils.toArray<HTMLElement>(".burst-piece");
      gsap.set(pool, { autoAlpha: 0, xPercent: -50, yPercent: -50, scale: 0.4 });
      let cursor = 0;
      let sx = 0;
      let sy = 0;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(pool, { autoAlpha: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const onDown = safe((e: PointerEvent) => {
          if (e.button !== 0) return;
          sx = e.clientX;
          sy = e.clientY;
        });

        const onUp = safe((e: PointerEvent) => {
          if (e.button !== 0) return;
          if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) return;

          const node = e.target as Node | null;
          const el = node instanceof Element ? node : node?.parentElement;
          if (el?.closest("input, textarea, select, a[href^='upi']")) return;

          const x = e.clientX;
          const y = e.clientY;
          for (let n = 0; n < PER_TAP; n++) {
            const piece = pool[(cursor + n) % pool.length];
            const angle = (Math.PI * 2 * n) / PER_TAP + Math.random() * 0.35;
            const dist = 36 + Math.random() * 56;
            gsap.fromTo(
              piece,
              {
                x,
                y,
                rotation: gsap.utils.random(-18, 18),
                scale: 0.38,
                autoAlpha: 0.95,
              },
              {
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist - 14,
                rotation: gsap.utils.random(-80, 80),
                scale: 1,
                autoAlpha: 0,
                duration: 0.7,
                delay: n * 0.02,
                ease: "power2.out",
                overwrite: true,
              },
            );
          }
          cursor = (cursor + PER_TAP) % pool.length;
        });

        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        return () => {
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointerup", onUp);
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden>
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          className="burst-piece absolute top-0 left-0"
          style={{ width: 16 + (i % 3) * 4, height: 16 + (i % 3) * 4 }}
        >
          <Jig fill={FILLS[i % FILLS.length]} />
        </span>
      ))}
    </div>
  );
}
