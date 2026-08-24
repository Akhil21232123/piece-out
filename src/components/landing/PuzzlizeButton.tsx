"use client";

import { type ButtonHTMLAttributes, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const BITS = ["#f5c400", "#e31b23", "#1d4ed8", "#fffaf3", "#9b2242"];

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

export function PuzzlizeButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const root = useRef<HTMLButtonElement>(null);

  useGSAP(
    () => {
      const bits = gsap.utils.toArray<HTMLElement>(".pz-bit", root.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      bits.forEach((el, i) => {
        const fromX = [-16, 16, -18, -14, 15][i % 5];
        const fromY = [-14, -15, 2, 16, 14][i % 5];
        gsap.fromTo(
          el,
          { x: fromX, y: fromY, rotation: [-28, 24, -20, 26, -18][i % 5], scale: 0.72 },
          {
            x: fromX * 0.12,
            y: fromY * 0.12,
            rotation: [-8, 7, -6, 9, -5][i % 5],
            scale: 1,
            duration: 1.15 + i * 0.07,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.08,
            force3D: true,
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <button {...props} ref={root} type="button" className={`relative overflow-visible ${className}`}>
      {BITS.map((fill, i) => (
        <span
          key={fill}
          className="pz-bit pointer-events-none absolute h-4 w-4"
          style={{
            top: i < 2 ? -6 : i === 2 ? "42%" : "auto",
            bottom: i > 2 ? -6 : "auto",
            left: i === 0 || i === 3 ? 10 : i === 2 ? -8 : "auto",
            right: i === 1 || i === 4 ? 10 : "auto",
          }}
        >
          <Jig fill={fill} />
        </span>
      ))}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
