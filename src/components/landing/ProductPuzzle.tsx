"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { themeFor } from "@/data/productThemes";
import { claimPeel, dropPeel, exclusivePeel, releasePeel } from "@/lib/peelLock";
import type { Product } from "@/data/products";

gsap.registerPlugin(useGSAP);
gsap.ticker.lagSmoothing(500, 33);

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
      let wrapOn = false;
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
      let claimed = false;
      const fit = product.fit === "contain" ? "contain" : "cover";

      wrap.classList.toggle("is-touch", phone);

      const sharp = (g: CanvasRenderingContext2D) => {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "medium";
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

      const drawFitted = (g: CanvasRenderingContext2D, img: CanvasImageSource, dw: number, dh: number) => {
        const pic = img as CanvasImageSource & {
          naturalWidth?: number;
          naturalHeight?: number;
          width?: number;
          height?: number;
        };
        const iw = Number(pic.naturalWidth || pic.width || 0);
        const ih = Number(pic.naturalHeight || pic.height || 0);
        if (!iw || !ih) return;
        const scale = fit === "contain" ? Math.min(dw / iw, dh / ih) : Math.max(dw / iw, dh / ih);
        const rw = iw * scale;
        const rh = ih * scale;
        g.drawImage(img, (dw - rw) / 2, (dh - rh) / 2, rw, rh);
      };

      const rasterPhoto = () => {
        photoLayer.width = canvas.width;
        photoLayer.height = canvas.height;
        sharp(photoLayerCtx);
        photoLayerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        photoLayerCtx.clearRect(0, 0, photoLayer.width, photoLayer.height);
        const shot = host?.querySelector("img");
        const src = shot && shot.complete && shot.naturalWidth ? shot : photo;
        drawFitted(photoLayerCtx, src, width, height);
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
        energy = 0;
        clear();
        live(false);
        running = false;
        gsap.ticker.remove(tick);
        if (claimed) {
          claimed = false;
          dropPeel(onStolen);
          releasePeel();
        }
      };

      const onStolen = () => {
        touchId = -1;
        energy = 0.18;
      };

      const layout = (force = false) => {
        if (!visible) return;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        if (w < 8 || h < 8) return;
        if (running && !force) return;
        if (
          !force &&
          ready &&
          bakedPhoto === photoOk &&
          Math.abs(w - lastW) < 2 &&
          Math.abs(h - lastH) < 2
        ) {
          if (!running) clear();
          return;
        }
        lastW = w;
        lastH = h;
        dpr = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
        width = w;
        height = h;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        sharp(ctx);
        if (photoOk) rasterPhoto();

        const cap = phone ? 120 : 160;
        const target = phone ? 28 : 26;
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
        for (const cell of shifted) paintCell(ctx, cell, cell.rot);
        ctx.restore();
      };

      const start = () => {
        if (reduced) return;
        exclusivePeel(onStolen);
        if (running) return;
        running = true;
        if (!claimed) {
          claimed = true;
          claimPeel();
        }
        live(true);
        gsap.ticker.add(tick);
      };

      const aim = (clientX: number, clientY: number, kick: number) => {
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

      const hoverish = (type: string) => type === "mouse" || type === "pen";
      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (!ready || !visible) return;
        if (hoverish(e.pointerType)) {
          if (!localIn(e.clientX, e.clientY)) {
            energy = Math.min(energy, 0.22);
            return;
          }
          aim(e.clientX, e.clientY, 1.05);
          return;
        }
        if (touchId >= 0 && e.pointerId !== touchId) return;
        if (!localIn(e.clientX, e.clientY)) {
          energy = Math.min(energy, 0.22);
          return;
        }
        aim(e.clientX, e.clientY, 1.12);
      });

      const onDown = safe((e: PointerEvent) => {
        if (!visible) return;
        if (!ready) layout(true);
        if (!ready) return;
        if (hoverish(e.pointerType) && e.button !== 0) return;
        if (!localIn(e.clientX, e.clientY)) return;
        if (!hoverish(e.pointerType)) {
          touchId = e.pointerId;
          try {
            wrap.setPointerCapture(e.pointerId);
          } catch {
            /* safari */
          }
        }
        aim(e.clientX, e.clientY, 1.15);
      });

      const onUp = safe((e: PointerEvent) => {
        if (e.pointerId === touchId) touchId = -1;
      });

      const onTouchStart = (e: TouchEvent) => {
        if (!visible || reduced) return;
        if (!ready) layout(true);
        if (!ready) return;
        const t = e.touches[0];
        if (!t || !localIn(t.clientX, t.clientY)) return;
        touchId = t.identifier;
        aim(t.clientX, t.clientY, 1.15);
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!ready || !visible) return;
        const t = [...e.touches].find((n) => n.identifier === touchId) ?? e.touches[0];
        if (!t) return;
        if (!localIn(t.clientX, t.clientY)) {
          energy = Math.min(energy, 0.22);
          return;
        }
        aim(t.clientX, t.clientY, 1.12);
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (touchId >= 0 && [...e.touches].some((n) => n.identifier === touchId)) return;
        touchId = -1;
      };

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

      const bindWrap = () => {
        if (wrapOn) return;
        wrapOn = true;
        wrap.addEventListener("pointerdown", onDown, { passive: true });
        wrap.addEventListener("pointermove", onMove, { passive: true });
        wrap.addEventListener("pointerup", onUp, { passive: true });
        wrap.addEventListener("touchstart", onTouchStart, { passive: true });
        wrap.addEventListener("touchmove", onTouchMove, { passive: true });
        wrap.addEventListener("touchend", onTouchEnd, { passive: true });
      };

      const unbindWrap = () => {
        if (!wrapOn) return;
        wrapOn = false;
        wrap.removeEventListener("pointerdown", onDown);
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerup", onUp);
        wrap.removeEventListener("touchstart", onTouchStart);
        wrap.removeEventListener("touchmove", onTouchMove);
        wrap.removeEventListener("touchend", onTouchEnd);
      };

      const inView = () => {
        const r = wrap.getBoundingClientRect();
        return r.bottom > -80 && r.top < window.innerHeight + 80;
      };
      visible = inView();
      if (visible) {
        if (!phone) layout();
        if (phone) bindWrap();
        else bindWin();
      }

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) {
            if (!phone) layout();
            if (phone) bindWrap();
            else bindWin();
          } else {
            unbindWin();
            unbindWrap();
            touchId = -1;
            if (running) rest();
          }
        },
        { rootMargin: "80px" },
      );
      io.observe(wrap);

      const ro = new ResizeObserver(() => {
        if (!visible) return;
        if (phone && !ready) return;
        layout();
      });
      ro.observe(wrap);

      const onPhoto = () => {
        photoOk = true;
        if (!visible || (phone && !ready)) return;
        if (running) {
          rasterPhoto();
          bakedPhoto = true;
          return;
        }
        layout(true);
      };
      photo.addEventListener("load", onPhoto);
      if (photo.complete && photo.naturalWidth) onPhoto();

      return () => {
        photo.removeEventListener("load", onPhoto);
        photo.src = "";
        live(false);
        unbindWin();
        unbindWrap();
        io.disconnect();
        ro.disconnect();
        gsap.ticker.remove(tick);
        wrap.classList.remove("is-touch", "is-live");
        if (claimed) {
          claimed = false;
          dropPeel(onStolen);
          releasePeel();
        }
      };
    },
    { scope: wrapRef, dependencies: [product.id, product.image, product.printedGrid, product.fit], revertOnUpdate: true },
  );

  return (
    <div ref={wrapRef} className="puzzle-play absolute inset-0 z-[1]" data-product-puzzle>
      <canvas ref={canvasRef} className="h-full w-full max-w-none" aria-hidden />
    </div>
  );
}
