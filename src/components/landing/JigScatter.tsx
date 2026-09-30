"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { PieceEdges } from "@/lib/jigsaw";
import { JigPiece } from "@/components/brand/JigPiece";

gsap.registerPlugin(useGSAP);

const CRUMBS: {
  left: string;
  top: string;
  w: number;
  fill: string;
  rot: number;
  edges: PieceEdges;
}[] = [
  { left: "2%", top: "16%", w: 86, fill: "#f5c400", rot: -16, edges: { n: 1, e: 0, s: 0, w: 1 } },
  { left: "90%", top: "20%", w: 78, fill: "#e31b23", rot: 14, edges: { n: 0, e: 1, s: 1, w: 0 } },
  { left: "4%", top: "58%", w: 70, fill: "#8A56B8", rot: 10, edges: { n: 0, e: -1, s: 1, w: 0 } },
  { left: "88%", top: "62%", w: 92, fill: "#171411", rot: -11, edges: { n: -1, e: 0, s: 0, w: 1 } },
  { left: "47%", top: "8%", w: 58, fill: "#fffaf3", rot: 8, edges: { n: 1, e: 1, s: 0, w: 0 } },
  { left: "12%", top: "86%", w: 64, fill: "#e31b23", rot: -8, edges: { n: 0, e: 1, s: 0, w: -1 } },
  { left: "78%", top: "88%", w: 72, fill: "#f5c400", rot: 12, edges: { n: 1, e: 0, s: -1, w: 0 } },
];

export function JigScatter() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      if (!root) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const bits = gsap.utils.toArray<HTMLElement>("[data-jig-crumb]", root);
      if (!bits.length) return;

      bits.forEach((bit, i) => {
        gsap.set(bit, { rotation: CRUMBS[i]?.rot ?? 0 });
      });
      if (reduced) return;

      const floats = gsap.utils.toArray<HTMLElement>("[data-jig-crumb-float]", root);
      floats.forEach((bit, i) => {
        gsap.to(bit, {
          y: i % 2 ? 12 : -12,
          rotation: i % 2 ? 5 : -5,
          duration: 3.2 + i * 0.28,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      const xTo = bits.map((bit) => gsap.quickTo(bit, "x", { duration: 0.55, ease: "power3.out" }));
      const yTo = bits.map((bit) => gsap.quickTo(bit, "y", { duration: 0.55, ease: "power3.out" }));
      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);
      const onMove = safe((event: PointerEvent) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        const mx = event.clientX / window.innerWidth - 0.5;
        const my = event.clientY / window.innerHeight - 0.5;
        bits.forEach((_, i) => {
          const dir = i % 2 ? -1 : 1;
          xTo[i](mx * 22 * dir);
          yTo[i](my * 16 * dir);
        });
      });
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="jig-scatter" aria-hidden>
      {CRUMBS.map((crumb, i) => (
        <div
          key={`${crumb.fill}-${i}`}
          data-jig-crumb
          className="jig-crumb"
          style={{ left: crumb.left, top: crumb.top, width: crumb.w, height: crumb.w }}
        >
          <div data-jig-crumb-float className="h-full w-full will-change-transform">
            <JigPiece edges={crumb.edges} fill={crumb.fill} stroke="rgba(23,20,17,0.35)" padClass="p-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
