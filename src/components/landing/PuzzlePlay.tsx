"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const FILLS = ["#f5c400", "#e31b23", "#1d4ed8", "#171411", "#9b2242", "#fffaf3"];
const TRAIL = 20;
const BURST = 8;
const TOTAL = TRAIL + BURST;

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

export function PuzzlePlay() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);
      const pieces = gsap.utils.toArray<HTMLElement>(".play-piece");
      const follows = gsap.utils.toArray<HTMLElement>(".play-follow");
      gsap.set(pieces, { autoAlpha: 0, xPercent: -50, yPercent: -50, force3D: true });
      gsap.set(follows, { autoAlpha: 0, xPercent: -50, yPercent: -50, force3D: true });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(pieces, { autoAlpha: 0 });
        gsap.set(follows, { autoAlpha: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!follows.length) return;

        const movers = follows.map((el, i) => ({
          x: gsap.quickTo(el, "x", { duration: 0.16 + i * 0.12, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 0.16 + i * 0.12, ease: "power3.out" }),
        }));
        const trail = pieces.slice(0, TRAIL);
        const burst = pieces.slice(TRAIL);
        let trailCursor = 0;
        let burstCursor = 0;
        let lastX = 0;
        let lastY = 0;
        let prevX = 0;
        let prevY = 0;
        let lastSpawn = 0;
        let lastScroll = window.scrollY;
        let downX = 0;
        let downY = 0;
        let primed = false;
        let touching = false;

        const skipTarget = (target: EventTarget | null) => {
          const node = target as Node | null;
          const el = node instanceof Element ? node : node?.parentElement;
          return Boolean(el?.closest("input, textarea, select, a[href^='upi'], [role='dialog'], [data-product-puzzle]"));
        };

        const showFollows = () => {
          follows.forEach((el, i) => {
            gsap.to(el, { autoAlpha: 0.95 - i * 0.22, duration: 0.12, overwrite: "auto" });
          });
        };

        const hideFollows = () => {
          gsap.to(follows, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
        };

        const spawnTrail = (x: number, y: number, extra: boolean) => {
          const count = extra ? 2 : 1;
          for (let n = 0; n < count; n++) {
            const piece = trail[trailCursor % trail.length];
            trailCursor += 1;
            const angle = Math.random() * Math.PI * 2;
            const dist = 8 + Math.random() * 28;
            gsap.fromTo(
              piece,
              {
                x: x + (n ? gsap.utils.random(-10, 10) : 0),
                y: y + (n ? gsap.utils.random(-10, 10) : 0),
                rotation: gsap.utils.random(-24, 24),
                scale: 0.38,
                autoAlpha: 0.95,
              },
              {
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                rotation: gsap.utils.random(-80, 80),
                scale: 0.82,
                autoAlpha: 0,
                duration: 0.5,
                ease: "power2.out",
                overwrite: true,
              },
            );
          }
        };

        const spawnBurst = (x: number, y: number) => {
          for (let n = 0; n < 6; n++) {
            const piece = burst[(burstCursor + n) % burst.length];
            const angle = (Math.PI * 2 * n) / 6 + Math.random() * 0.25;
            const dist = 32 + Math.random() * 48;
            gsap.fromTo(
              piece,
              {
                x,
                y,
                rotation: gsap.utils.random(-16, 16),
                scale: 0.32,
                autoAlpha: 1,
              },
              {
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist - 12,
                rotation: gsap.utils.random(-90, 90),
                scale: 1.05,
                autoAlpha: 0,
                duration: 0.62,
                delay: n * 0.012,
                ease: "power2.out",
                overwrite: true,
              },
            );
          }
          burstCursor = (burstCursor + 6) % burst.length;
        };

        const onMove = safe((e: PointerEvent) => {
          if (skipTarget(e.target)) return;
          const touch = e.pointerType === "touch";
          if (touch && !touching) return;

          const scrollY = window.scrollY;
          const scrolled = Math.abs(scrollY - lastScroll) > 1;
          lastScroll = scrollY;
          if (touch && scrolled) {
            prevX = e.clientX;
            prevY = e.clientY;
            return;
          }

          const stepX = e.clientX - prevX;
          const stepY = e.clientY - prevY;
          prevX = e.clientX;
          prevY = e.clientY;

          if (touch && Math.abs(stepY) > 14 && Math.abs(stepY) > Math.abs(stepX) * 1.35) {
            return;
          }

          movers.forEach((m) => {
            m.x(e.clientX);
            m.y(e.clientY);
          });
          showFollows();

          if (!primed) {
            primed = true;
            lastX = e.clientX;
            lastY = e.clientY;
            return;
          }

          const now = performance.now();
          const moved = Math.hypot(e.clientX - lastX, e.clientY - lastY);
          const gap = touch ? 22 : 16;
          if (moved > gap && now - lastSpawn > 28) {
            spawnTrail(e.clientX, e.clientY, moved > 42);
            lastSpawn = now;
            lastX = e.clientX;
            lastY = e.clientY;
          }
        });

        const onDown = safe((e: PointerEvent) => {
          if (e.button !== 0) return;
          touching = e.pointerType === "touch" || e.pointerType === "pen";
          primed = true;
          downX = e.clientX;
          downY = e.clientY;
          lastX = e.clientX;
          lastY = e.clientY;
          prevX = e.clientX;
          prevY = e.clientY;
          lastScroll = window.scrollY;
          movers.forEach((m) => {
            m.x(e.clientX);
            m.y(e.clientY);
          });
          showFollows();
        });

        const onUp = safe((e: PointerEvent) => {
          if (e.button !== 0) return;
          const wasTouch = touching;
          touching = false;
          if (wasTouch) hideFollows();
          if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
          if (skipTarget(e.target)) return;
          spawnBurst(e.clientX, e.clientY);
        });

        const onLeave = () => {
          if (!touching) hideFollows();
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        window.addEventListener("pointercancel", onUp, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        return () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerdown", onDown);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          document.removeEventListener("mouseleave", onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="pointer-events-none fixed inset-0 z-[35] overflow-hidden" aria-hidden>
      <span className="play-follow absolute top-0 left-0 h-7 w-7">
        <Jig fill="#e31b23" />
      </span>
      <span className="play-follow absolute top-0 left-0 h-5 w-5">
        <Jig fill="#f5c400" />
      </span>
      <span className="play-follow absolute top-0 left-0 h-4 w-4">
        <Jig fill="#1d4ed8" />
      </span>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className="play-piece absolute top-0 left-0"
          style={{ width: 14 + (i % 5) * 4, height: 14 + (i % 5) * 4 }}
        >
          <Jig fill={FILLS[i % FILLS.length]} />
        </span>
      ))}
    </div>
  );
}
