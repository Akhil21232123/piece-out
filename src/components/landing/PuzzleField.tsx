"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";

gsap.registerPlugin(useGSAP);

const FILLS = ["#f5c400", "#e31b23", "#1d4ed8", "#9b2242", "#fffaf3", "#efe8dc"];

type Cell = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  rot: number;
  fill: string;
  path: Path2D;
};

export function PuzzleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let cells: Cell[] = [];
      let dpr = 1;
      let width = 0;
      let height = 0;
      let moving = false;
      let lastScroll = window.scrollY;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let resizeAt = 0;
      let size = 22;

      const skipTarget = (target: EventTarget | null) => {
        const node = target as Node | null;
        const el = node instanceof Element ? node : node?.parentElement;
        return Boolean(
          el?.closest("input, textarea, select, a[href^='upi'], [role='dialog'], [data-product-puzzle]"),
        );
      };

      const layout = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        dpr = Math.min(1.75, window.devicePixelRatio || 1);
        width = w;
        height = h;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        size = w < 640 ? 20 : 22;
        let cols = Math.ceil(w / size) + 2;
        let rows = Math.ceil(h / size) + 2;
        while (cols * rows > 900) {
          size += 1;
          cols = Math.ceil(w / size) + 2;
          rows = Math.ceil(h / size) + 2;
        }

        const ox = (w - (cols - 1) * size) / 2;
        const oy = (h - (rows - 1) * size) / 2;
        const next: Cell[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const homeX = ox + c * size;
            const homeY = oy + r * size;
            next.push({
              homeX,
              homeY,
              x: homeX,
              y: homeY,
              rot: 0,
              fill: FILLS[(c * 3 + r * 5) % FILLS.length],
              path: jigPath(size, edgesFor(c, r, cols, rows)),
            });
          }
        }
        cells = next;
      };

      const draw = () => {
        if (resizeAt && performance.now() - resizeAt > 60) {
          layout();
          resizeAt = 0;
        }

        const dt = Math.min(2, gsap.ticker.deltaRatio(60));
        cx += (aimX - cx) * (1 - Math.pow(0.8, dt));
        cy += (aimY - cy) * (1 - Math.pow(0.8, dt));
        energy *= Math.pow(0.91, dt);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const radius = 88;
        const r2 = radius * radius;
        const lift = reduced ? 0 : 9 * energy;
        const t = reduced ? 0 : performance.now() * 0.0007;

        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const idleX = reduced ? 0 : Math.sin(t + i * 0.37) * 0.45;
          const idleY = reduced ? 0 : Math.cos(t * 0.9 + i * 0.29) * 0.45;
          let tx = cell.homeX;
          let ty = cell.homeY;
          let tr = 0;
          if (!reduced && energy > 0.03) {
            const dx = cell.homeX - cx;
            const dy = cell.homeY - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.4) {
              const d = Math.sqrt(d2);
              const fall = (1 - d / radius) ** 2;
              tx += (dx / d) * fall * lift;
              ty += (dy / d) * fall * lift;
              tr = fall * 0.12 * (dx > 0 ? 1 : -1);
            }
          }
          cell.x += (tx - cell.x) * (1 - Math.pow(0.74, dt));
          cell.rot += (tr - cell.rot) * (1 - Math.pow(0.74, dt));
          cell.y += (ty - cell.y) * (1 - Math.pow(0.74, dt));

          ctx.save();
          ctx.translate(cell.x + idleX, cell.y + idleY);
          ctx.rotate(cell.rot);
          ctx.globalAlpha = cell.fill === "#efe8dc" ? 0.06 : 0.1;
          ctx.fillStyle = cell.fill;
          ctx.fill(cell.path);
          ctx.globalAlpha = 0.12;
          ctx.strokeStyle = "#171411";
          ctx.lineWidth = 0.6;
          ctx.stroke(cell.path);
          ctx.restore();
        }
      };

      layout();
      draw();

      if (reduced) {
        const onResize = () => {
          layout();
          draw();
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
      }

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (skipTarget(e.target)) return;
        const touch = e.pointerType === "touch";
        if (touch && e.buttons === 0 && !moving) return;
        const scrolled = Math.abs(window.scrollY - lastScroll) > 2;
        lastScroll = window.scrollY;
        if (touch && scrolled) return;
        aimX = e.clientX;
        aimY = e.clientY;
        energy = Math.min(1.1, energy + 0.2);
      });

      const onDown = safe((e: PointerEvent) => {
        if (e.button !== 0) return;
        if (skipTarget(e.target)) return;
        moving = e.pointerType === "touch" || e.pointerType === "pen";
        lastScroll = window.scrollY;
        aimX = e.clientX;
        aimY = e.clientY;
        energy = 1.2;
      });

      const onUp = () => {
        moving = false;
      };

      const onResize = () => {
        resizeAt = performance.now();
      };

      gsap.ticker.add(draw);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      return () => {
        gsap.ticker.remove(draw);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onResize);
      };
    },
    { scope: canvasRef },
  );

  return (
    <canvas
      ref={canvasRef}
      className="puzzle-field pointer-events-none fixed inset-0 z-[1]"
      aria-hidden
    />
  );
}
