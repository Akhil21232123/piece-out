"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { themeFor } from "@/data/productThemes";
import { scrollBusy } from "@/lib/scrollPulse";
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

      const host = (wrap.closest(".puzzle-host") ?? wrap.parentElement) as HTMLElement | null;
      const theme = themeFor(product.id);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mousey =
        window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;
      const phone = !mousey;
      const photo = new Image();
      photo.decoding = "async";
      photo.src = product.image;
      const photoLayer = document.createElement("canvas");
      const photoLayerCtx = photoLayer.getContext("2d")!;

      let cells: Cell[] = [];
      let cols = 8;
      let rows = 8;
      let dpr = 1;
      let width = 0;
      let height = 0;
      let cellW = 24;
      let cellH = 24;
      let size = 24;
      let ready = false;
      let running = false;
      let visible = false;
      let winOn = false;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let photoOk = false;
      let bakedPhoto = false;
      let lastW = 0;
      let lastH = 0;
      let touchId = -1;
      let shifted: Cell[] = [];
      const paper = "#efe8dc";

      const sharp = (g: CanvasRenderingContext2D) => {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "high";
      };

      sharp(ctx);
      sharp(photoLayerCtx);

      const live = (on: boolean) => {
        wrap.classList.toggle("is-live", on);
        canvas.style.opacity = on ? "1" : "0";
      };

      const clear = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };

      const clipPhoto = () => {
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.clip();
      };

      const groove = (g: CanvasRenderingContext2D, path: Path2D) => {
        g.lineJoin = "round";
        g.lineCap = "round";
        g.strokeStyle = phone ? "rgba(23,20,17,0.2)" : "rgba(23,20,17,0.14)";
        g.lineWidth = phone ? 0.85 : 0.7;
        g.stroke(path);
      };

      const paintCell = (g: CanvasRenderingContext2D, cell: Cell, rot: number) => {
        g.save();
        g.translate(cell.x, cell.y);
        g.rotate(rot);
        g.clip(cell.path);
        if (photoOk) {
          sharp(g);
          g.drawImage(photoLayer, -cell.homeX, -cell.homeY, width, height);
        } else {
          g.fillStyle = cell.fill;
          g.fillRect(-4, -4, cellW + 8, cellH + 8);
        }
        g.restore();
        g.save();
        g.translate(cell.x, cell.y);
        g.rotate(rot);
        groove(g, cell.path);
        g.restore();
      };

      const rasterPhoto = () => {
        photoLayer.width = canvas.width;
        photoLayer.height = canvas.height;
        sharp(photoLayerCtx);
        photoLayerCtx.setTransform(1, 0, 0, 1, 0, 0);
        photoLayerCtx.clearRect(0, 0, photoLayer.width, photoLayer.height);
        photoLayerCtx.drawImage(photo, 0, 0, photoLayer.width, photoLayer.height);
      };

      const punch = (g: CanvasRenderingContext2D, cell: Cell) => {
        g.save();
        g.translate(cell.homeX, cell.homeY);
        g.fillStyle = paper;
        g.fill(cell.path);
        g.restore();
      };

      const around = (px: number, py: number, radius: number) => {
        const pad = radius + size;
        const c0 = Math.max(0, Math.floor((px - pad) / cellW));
        const c1 = Math.min(cols - 1, Math.floor((px + pad) / cellW));
        const r0 = Math.max(0, Math.floor((py - pad) / cellH));
        const r1 = Math.min(rows - 1, Math.floor((py + pad) / cellH));
        const out: Cell[] = [];
        for (let r = r0; r <= r1; r++) {
          const row = r * cols;
          for (let c = c0; c <= c1; c++) {
            const cell = cells[row + c];
            if (cell) out.push(cell);
          }
        }
        return out;
      };

      const rest = () => {
        for (const cell of cells) {
          cell.x = cell.homeX;
          cell.y = cell.homeY;
          cell.rot = 0;
        }
        shifted = [];
        clear();
        live(false);
        running = false;
        gsap.ticker.remove(tick);
      };

      const layout = () => {
        if (!visible) return;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        if (w < 8 || h < 8) return;
        if (ready && bakedPhoto === photoOk && Math.abs(w - lastW) < 0.5 && Math.abs(h - lastH) < 0.5) {
          if (!running) clear();
          return;
        }
        lastW = w;
        lastH = h;
        dpr = Math.min(3, window.devicePixelRatio || 1);
        width = w;
        height = h;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        sharp(ctx);
        if (photoOk) rasterPhoto();

        const cap = phone ? 240 : 300;
        const target = phone ? 20 : 22;
        cols = Math.max(8, Math.round(w / target));
        rows = Math.max(8, Math.round(h / target));
        while (cols * rows > cap && (cols > 8 || rows > 8)) {
          if (cols >= rows && cols > 8) cols -= 1;
          else if (rows > 8) rows -= 1;
          else break;
        }
        cellW = w / cols;
        cellH = h / rows;
        size = Math.min(cellW, cellH);
        const next: Cell[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            next.push({
              homeX: c * cellW,
              homeY: r * cellH,
              x: c * cellW,
              y: r * cellH,
              rot: 0,
              path: jigPath(cellW, edgesFor(c, r, cols, rows), cellH),
              fill: theme.pieces[(c + r * 3) % theme.pieces.length],
            });
          }
        }
        cells = next;
        ready = true;
        bakedPhoto = photoOk;
        clear();
        live(false);
      };

      const tick = () => {
        if (!ready) return;
        const dt = Math.min(1.6, gsap.ticker.deltaRatio(60));
        const follow = 1 - Math.pow(0.42, dt);
        cx += (aimX - cx) * follow;
        cy += (aimY - cy) * follow;
        energy *= Math.pow(0.88, dt);

        if (energy < 0.025) {
          rest();
          return;
        }

        const radius = phone ? 110 : 100;
        const r2 = radius * radius;
        const lift = reduced ? 0 : (phone ? 22 : 26) * energy;
        const ease = 1 - Math.pow(0.48, dt);

        const near = around(cx, cy, radius);
        const nearSet = new Set(near);
        for (const cell of shifted) {
          if (nearSet.has(cell)) continue;
          cell.x = cell.homeX;
          cell.y = cell.homeY;
          cell.rot = 0;
        }

        const next: Cell[] = [];
        for (const cell of near) {
          if (!cell) continue;
          let tx = cell.homeX;
          let ty = cell.homeY;
          let tr = 0;
          const dx = cell.homeX + cellW / 2 - cx;
          const dy = cell.homeY + cellH / 2 - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 && d2 > 0.4) {
            const d = Math.sqrt(d2);
            const fall = (1 - d / radius) ** 1.6;
            tx += (dx / d) * fall * lift;
            ty += (dy / d) * fall * lift - fall * 4;
            tr = fall * 0.16 * (dx > 0 ? 1 : -1);
          }
          cell.x += (tx - cell.x) * ease;
          cell.y += (ty - cell.y) * ease;
          cell.rot += (tr - cell.rot) * ease;
          if (Math.hypot(cell.x - cell.homeX, cell.y - cell.homeY) > 0.45 || Math.abs(cell.rot) > 0.012) {
            next.push(cell);
          }
        }
        shifted = next;

        clear();
        if (!shifted.length) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        clipPhoto();
        sharp(ctx);
        for (const cell of shifted) punch(ctx, cell);
        for (const cell of shifted) paintCell(ctx, cell, cell.rot);
        ctx.restore();
      };

      const start = () => {
        if (reduced || running) return;
        running = true;
        live(true);
        gsap.ticker.add(tick);
      };

      const aim = (clientX: number, clientY: number, kick: number) => {
        if (scrollBusy()) return;
        const rect = canvas.getBoundingClientRect();
        aimX = clientX - rect.left;
        aimY = clientY - rect.top;
        energy = Math.min(1.2, Math.max(energy, kick));
        start();
      };

      const localIn = (clientX: number, clientY: number) => {
        const rect = wrap.getBoundingClientRect();
        return (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        );
      };

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (!ready) return;
        if (e.pointerType === "mouse") {
          if (!localIn(e.clientX, e.clientY)) {
            energy = Math.min(energy, 0.22);
            return;
          }
          aim(e.clientX, e.clientY, 1.05);
          return;
        }
        if (e.pointerId !== touchId) return;
        if (!localIn(e.clientX, e.clientY) || scrollBusy()) return;
        aim(e.clientX, e.clientY, 1.12);
      });

      const onDown = safe((e: PointerEvent) => {
        if (!ready || e.button !== 0) return;
        if (e.pointerType === "mouse") {
          if (!localIn(e.clientX, e.clientY)) return;
          aim(e.clientX, e.clientY, 1.15);
          return;
        }
        if (!localIn(e.clientX, e.clientY)) return;
        touchId = e.pointerId;
        aim(e.clientX, e.clientY, 1.15);
      });

      const onUp = safe((e: PointerEvent) => {
        if (e.pointerId === touchId) touchId = -1;
      });

      const bindWin = () => {
        if (winOn) return;
        winOn = true;
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        window.addEventListener("pointercancel", onUp, { passive: true });
      };

      const unbindWin = () => {
        if (!winOn) return;
        winOn = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      const inView = () => {
        const r = wrap.getBoundingClientRect();
        return r.bottom > -80 && r.top < window.innerHeight + 80;
      };
      visible = inView();
      if (visible) layout();

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) {
            layout();
            bindWin();
          } else {
            unbindWin();
            touchId = -1;
            if (running) rest();
          }
        },
        { rootMargin: "80px" },
      );
      io.observe(wrap);
      if (visible) bindWin();

      const ro = new ResizeObserver(() => {
        if (visible) layout();
      });
      ro.observe(wrap);

      const onPhoto = () => {
        photoOk = true;
        if (visible) layout();
      };
      photo.addEventListener("load", onPhoto);
      if (photo.complete && photo.naturalWidth) onPhoto();

      host?.addEventListener("pointerdown", onDown as EventListener, { passive: true });
      host?.addEventListener("pointerup", onUp as EventListener, { passive: true });
      host?.addEventListener("pointercancel", onUp as EventListener, { passive: true });

      return () => {
        photo.removeEventListener("load", onPhoto);
        photo.src = "";
        live(false);
        unbindWin();
        io.disconnect();
        ro.disconnect();
        gsap.ticker.remove(tick);
        host?.removeEventListener("pointerdown", onDown as EventListener);
        host?.removeEventListener("pointerup", onUp as EventListener);
        host?.removeEventListener("pointercancel", onUp as EventListener);
      };
    },
    { scope: wrapRef, dependencies: [product.id, product.image], revertOnUpdate: true },
  );

  return (
    <div ref={wrapRef} className="puzzle-play absolute inset-0 z-[1]" data-product-puzzle>
      <canvas ref={canvasRef} className="h-full w-full max-w-none" aria-hidden />
    </div>
  );
}
