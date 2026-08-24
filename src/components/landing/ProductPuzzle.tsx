"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { themeFor } from "@/data/productThemes";
import type { Product } from "@/data/products";

gsap.registerPlugin(useGSAP);

type Cell = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  rot: number;
  path: Path2D;
  fill: string;
};

export function ProductPuzzle({ product }: { product: Product }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) return;

      const theme = themeFor(product.id);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const photo = new Image();
      photo.src = product.image;

      let cells: Cell[] = [];
      let dpr = 1;
      let width = 0;
      let height = 0;
      let size = 28;
      let ready = false;
      let running = false;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let photoOk = false;

      const layout = () => {
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        dpr = Math.min(1.75, window.devicePixelRatio || 1);
        width = w;
        height = h;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        size = w < 420 ? 26 : 30;
        const cols = Math.max(6, Math.round(w / size));
        const rows = Math.max(6, Math.round(h / size));
        size = w / cols;
        const next: Cell[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            next.push({
              homeX: c * size,
              homeY: r * size,
              x: c * size,
              y: r * size,
              rot: 0,
              path: jigPath(size, edgesFor(c, r, cols, rows)),
              fill: theme.pieces[(c + r * 3) % theme.pieces.length],
            });
          }
        }
        cells = next;
        ready = true;
        paint(true);
      };

      const tick = () => paint();

      const paint = (force = false) => {
        if (!ready) return;
        const dt = Math.min(2, gsap.ticker.deltaRatio(60));
        cx += (aimX - cx) * (1 - Math.pow(0.78, dt));
        cy += (aimY - cy) * (1 - Math.pow(0.78, dt));
        energy *= Math.pow(0.94, dt);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = theme.paper;
        ctx.fillRect(0, 0, width, height);

        const radius = 78;
        const r2 = radius * radius;
        const lift = reduced ? 0 : 22 * energy;
        let moving = false;

        for (const cell of cells) {
          let tx = cell.homeX;
          let ty = cell.homeY;
          let tr = 0;
          if (!reduced && energy > 0.03) {
            const dx = cell.homeX + size / 2 - cx;
            const dy = cell.homeY + size / 2 - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.4) {
              const d = Math.sqrt(d2);
              const fall = (1 - d / radius) ** 2;
              tx += (dx / d) * fall * lift;
              ty += (dy / d) * fall * lift;
              tr = fall * 0.16 * (dx > 0 ? 1 : -1);
            }
          }
          cell.x += (tx - cell.x) * (1 - Math.pow(0.7, dt));
          cell.y += (ty - cell.y) * (1 - Math.pow(0.7, dt));
          cell.rot += (tr - cell.rot) * (1 - Math.pow(0.7, dt));
          if (Math.abs(cell.x - cell.homeX) + Math.abs(cell.y - cell.homeY) > 0.35) moving = true;

          ctx.save();
          ctx.translate(cell.x, cell.y);
          ctx.rotate(cell.rot);
          ctx.clip(cell.path);
          if (photoOk) {
            ctx.drawImage(photo, -cell.homeX, -cell.homeY, width, height);
          } else {
            ctx.fillStyle = cell.fill;
            ctx.fillRect(-4, -4, size + 8, size + 8);
          }
          ctx.restore();

          ctx.save();
          ctx.translate(cell.x, cell.y);
          ctx.rotate(cell.rot);
          ctx.strokeStyle = theme.stroke;
          ctx.lineWidth = 1;
          ctx.stroke(cell.path);
          ctx.restore();
        }

        if (!force && !moving && energy < 0.02 && running) {
          running = false;
          gsap.ticker.remove(tick);
        }
      };

      const start = () => {
        if (reduced || running) return;
        running = true;
        gsap.ticker.add(tick);
      };

      const local = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        const p = local(e);
        aimX = p.x;
        aimY = p.y;
        energy = Math.min(1.2, energy + 0.24);
        start();
      });

      const onDown = safe((e: PointerEvent) => {
        if (e.button !== 0) return;
        const p = local(e);
        aimX = p.x;
        aimY = p.y;
        energy = 1.25;
        start();
      });

      const onLeave = () => {
        energy = Math.min(energy, 0.4);
      };

      const ro = new ResizeObserver(() => layout());
      ro.observe(wrap);
      photo.onload = () => {
        photoOk = true;
        layout();
      };
      if (photo.complete && photo.naturalWidth) {
        photoOk = true;
      }
      layout();

      canvas.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerdown", onDown, { passive: true });
      canvas.addEventListener("pointerleave", onLeave);
      return () => {
        photo.onload = null;
        ro.disconnect();
        gsap.ticker.remove(tick);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: wrapRef, dependencies: [product.id, product.image], revertOnUpdate: true },
  );

  return (
    <div ref={wrapRef} className="absolute inset-0 z-[1]" data-product-puzzle>
      <canvas ref={canvasRef} className="h-full w-full max-w-none" aria-hidden />
    </div>
  );
}
