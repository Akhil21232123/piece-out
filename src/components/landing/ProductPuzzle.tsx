"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { onScrollPulse } from "@/lib/scrollPulse";
import type { Product } from "@/data/products";

gsap.registerPlugin(useGSAP);

const layoutQueue: Array<() => void> = [];
let pumping = false;

function enqueueLayout(job: () => void) {
  layoutQueue.push(job);
  if (pumping) return;
  pumping = true;
  const pump = () => {
    const fn = layoutQueue.shift();
    fn?.();
    if (!layoutQueue.length) {
      pumping = false;
      return;
    }
    if (typeof requestIdleCallback === "function") requestIdleCallback(pump, { timeout: 60 });
    else requestAnimationFrame(pump);
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(pump, { timeout: 60 });
  else requestAnimationFrame(pump);
}

type Cell = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  rot: number;
  vx: number;
  vy: number;
  vr: number;
  path: Path2D;
  sx: number;
  sy: number;
};

function carve(g: CanvasRenderingContext2D, path: Path2D) {
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = "rgba(23,20,17,0.34)";
  g.lineWidth = 1.15;
  g.stroke(path);
  g.strokeStyle = "rgba(255,250,243,0.28)";
  g.lineWidth = 0.55;
  g.stroke(path);
}

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

      const host = wrap.closest(".puzzle-host") ?? wrap.parentElement;
      const paper = "#efe8dc";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mousey =
        window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches;
      const board = document.createElement("canvas");
      const atlas = document.createElement("canvas");
      const boardCtx = board.getContext("2d")!;
      const atlasCtx = atlas.getContext("2d")!;
      const hot = new Set<number>();

      let cells: Cell[] = [];
      let dpr = 1;
      let size = 22;
      let pad = 8;
      let tile = 40;
      let colCount = 0;
      let ready = false;
      let running = false;
      let visible = false;
      let photoOk = false;
      let scrolling = false;
      let holding = false;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let wave = 1.4;
      let lastW = 0;
      let lastH = 0;
      let lastSrc = "";
      let atlasHasPhoto = false;
      let resizeTimer = 0;
      let tapX = 0;
      let tapY = 0;
      let tapAt = 0;
      let holdTimer = 0;
      let gustAt = 0;
      let breathTimer = 0;
      let tick: () => void = () => {};
      let startTick: () => void = () => {};

      const shot = new Image();
      shot.decoding = "async";
      shot.src = product.image;

      const radiusFor = () => size * (mousey ? 5.4 : 6.4);

      const markReady = () => {
        host?.classList.toggle("puzzle-ready", ready && photoOk);
      };

      const hideCanvas = () => {
        photoOk = false;
        canvas.style.opacity = "0";
        host?.classList.remove("puzzle-ready");
      };

      const smooth = (g: CanvasRenderingContext2D) => {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "high";
      };

      const blitBoard = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(board, 0, 0);
      };

      const paintBoard = (w: number, h: number) => {
        boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        boardCtx.fillStyle = paper;
        boardCtx.fillRect(0, 0, w, h);
        for (const cell of cells) {
          boardCtx.drawImage(
            atlas,
            cell.sx * dpr,
            cell.sy * dpr,
            tile * dpr,
            tile * dpr,
            cell.homeX - pad,
            cell.homeY - pad,
            tile,
            tile,
          );
        }
      };

      const drawShadow = (cell: Cell, scale: number) => {
        const ox = size / 2;
        const oy = size / 2;
        const lift = Math.max(0, scale - 1);
        ctx.save();
        ctx.translate(cell.x + ox + lift * 10, cell.y + oy + 3 + lift * 18);
        ctx.rotate(cell.rot);
        ctx.scale(scale, scale);
        ctx.translate(-ox, -oy);
        ctx.fillStyle = `rgba(23,20,17,${0.1 + lift * 0.55})`;
        ctx.fill(cell.path);
        ctx.restore();
      };

      const drawPiece = (cell: Cell, scale: number) => {
        const ox = size / 2;
        const oy = size / 2;
        ctx.save();
        ctx.translate(cell.x + ox, cell.y + oy);
        ctx.rotate(cell.rot);
        ctx.scale(scale, scale);
        ctx.drawImage(
          atlas,
          cell.sx * dpr,
          cell.sy * dpr,
          tile * dpr,
          tile * dpr,
          -pad - ox,
          -pad - oy,
          tile,
          tile,
        );
        ctx.strokeStyle = "rgba(23,20,17,0.38)";
        ctx.lineWidth = 0.9;
        ctx.lineJoin = "round";
        ctx.translate(-ox, -oy);
        ctx.stroke(cell.path);
        ctx.restore();
      };

      const snapHome = () => {
        for (const i of hot) {
          const cell = cells[i];
          if (!cell) continue;
          cell.x = cell.homeX;
          cell.y = cell.homeY;
          cell.rot = 0;
          cell.vx = 0;
          cell.vy = 0;
          cell.vr = 0;
        }
        hot.clear();
        energy = 0;
        wave = 1.4;
        if (running) {
          running = false;
          gsap.ticker.remove(tick);
        }
        if (ready) blitBoard();
      };

      const layout = () => {
        if (!visible) return;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        if (w < 8 || h < 8) return;

        if (!shot.complete || shot.naturalWidth < 8) {
          hideCanvas();
          return;
        }
        photoOk = true;
        const src = shot.currentSrc || shot.src;
        const same =
          ready && atlasHasPhoto && lastSrc === src && Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1;
        if (same) {
          canvas.style.opacity = "1";
          markReady();
          return;
        }
        lastW = w;
        lastH = h;
        lastSrc = src;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        board.width = canvas.width;
        board.height = canvas.height;
        smooth(ctx);
        smooth(boardCtx);
        smooth(atlasCtx);

        const cap = w < 420 ? 460 : 700;
        size = w < 420 ? 15.5 : 18;
        let cols = Math.max(12, Math.round(w / size));
        size = w / cols;
        let rows = Math.max(12, Math.round(h / size));
        while (cols * rows > cap && cols > 12) {
          cols -= 1;
          size = w / cols;
          rows = Math.max(12, Math.round(h / size));
        }
        pad = size * 0.32;
        tile = size + pad * 2;
        colCount = cols;
        hot.clear();

        atlas.width = Math.ceil(cols * tile * dpr);
        atlas.height = Math.ceil(rows * tile * dpr);
        atlasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        atlasCtx.clearRect(0, 0, cols * tile, rows * tile);

        const photoBoard = document.createElement("canvas");
        photoBoard.width = Math.floor(w * dpr);
        photoBoard.height = Math.floor(h * dpr);
        const pctx = photoBoard.getContext("2d")!;
        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        smooth(pctx);
        pctx.drawImage(shot, 0, 0, w, h);

        const next: Cell[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const homeX = c * size;
            const homeY = r * size;
            const path = jigPath(size, edgesFor(c, r, cols, rows));
            const sx = c * tile;
            const sy = r * tile;
            next.push({
              homeX,
              homeY,
              x: homeX,
              y: homeY,
              rot: 0,
              vx: 0,
              vy: 0,
              vr: 0,
              path,
              sx,
              sy,
            });
            atlasCtx.save();
            atlasCtx.translate(sx + pad, sy + pad);
            atlasCtx.beginPath();
            atlasCtx.clip(path);
            atlasCtx.drawImage(photoBoard, -homeX, -homeY, w, h);
            atlasCtx.restore();
            atlasCtx.save();
            atlasCtx.translate(sx + pad, sy + pad);
            carve(atlasCtx, path);
            atlasCtx.restore();
          }
        }
        cells = next;
        ready = true;
        atlasHasPhoto = photoOk;
        canvas.style.opacity = "1";
        paintBoard(w, h);
        blitBoard();
        markReady();
      };

      const markNear = (px: number, py: number, radius: number) => {
        if (!colCount) return;
        const reach = radius + size;
        const minC = Math.max(0, Math.floor((px - reach) / size));
        const maxC = Math.min(colCount - 1, Math.floor((px + reach) / size));
        const minR = Math.max(0, Math.floor((py - reach) / size));
        const maxR = Math.min(Math.floor(cells.length / colCount) - 1, Math.floor((py + reach) / size));
        for (let r = minR; r <= maxR; r++) {
          const row = r * colCount;
          for (let c = minC; c <= maxC; c++) hot.add(row + c);
        }
      };

      tick = () => {
        if (!ready || scrolling) return;
        const dt = Math.min(2, gsap.ticker.deltaRatio(60));
        const radius = radiusFor();
        const r2 = radius * radius;
        const sigma = size * 1.55;

        cx += (aimX - cx) * (1 - Math.pow(0.72, dt));
        cy += (aimY - cy) * (1 - Math.pow(0.72, dt));
        if (holding) energy = Math.max(energy, 1);
        else energy *= Math.pow(0.93, dt);
        wave += dt * 0.078;

        const waveR = Math.min(radius * 1.08, wave * radius * 0.92);
        const shocky = wave < 1.15 && energy > 0.18;
        const lift = reduced ? 0 : (holding ? 70 : shocky ? 58 : mousey ? 44 : 50) * energy;
        const acc = holding ? 0.26 : shocky ? 0.2 : 0.32;
        const damp = Math.pow(holding ? 0.8 : shocky ? 0.82 : 0.7, dt);

        blitBoard();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        let moving = energy > 0.02;
        if (!reduced && energy > 0.02) markNear(cx, cy, radius);

        const live = Array.from(hot);
        live.sort((a, b) => {
          const ca = cells[a];
          const cb = cells[b];
          if (!ca || !cb) return 0;
          const da = (ca.homeX - cx) ** 2 + (ca.homeY - cy) ** 2;
          const db = (cb.homeX - cx) ** 2 + (cb.homeY - cy) ** 2;
          return db - da;
        });

        for (const i of live) {
          const cell = cells[i];
          if (!cell) continue;
          let tx = cell.homeX;
          let ty = cell.homeY;
          let tr = 0;
          let scale = 1;
          if (!reduced && energy > 0.02) {
            const dx = cell.homeX + size / 2 - cx;
            const dy = cell.homeY + size / 2 - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.4) {
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;
              const hole = (1 - d / radius) ** 2;
              const crest = shocky ? Math.exp(-((d - waveR) * (d - waveR)) / (2 * sigma * sigma)) : 0;
              const bow = mousey && !holding ? Math.exp(-((d - radius * 0.42) ** 2) / (2 * (size * 1.1) ** 2)) * 0.45 : 0;
              const fall = holding ? hole : hole * (shocky ? 0.38 : 0.85) + crest * 1.25 + bow;
              tx += nx * fall * lift;
              ty += ny * fall * lift - crest * lift * 0.22;
              tr = fall * (holding ? 0.34 : 0.26) * (dx > 0 ? 1 : -1);
              scale = 1 + fall * (holding ? 0.16 : 0.12) * Math.max(energy, 0.4);
              if (crest > 0.55) {
                cell.vx += nx * crest * 1.6 * dt;
                cell.vy += ny * crest * 1.6 * dt;
              }
            }
          }
          cell.vx = cell.vx * damp + (tx - cell.x) * acc * dt;
          cell.vy = cell.vy * damp + (ty - cell.y) * acc * dt;
          cell.vr = cell.vr * damp + (tr - cell.rot) * acc * dt;
          cell.x += cell.vx;
          cell.y += cell.vy;
          cell.rot += cell.vr;
          const moved = Math.abs(cell.x - cell.homeX) + Math.abs(cell.y - cell.homeY);
          const spinning = Math.abs(cell.rot);
          if (
            moved < 0.22 &&
            spinning < 0.006 &&
            scale < 1.012 &&
            Math.abs(cell.vx) + Math.abs(cell.vy) < 0.12 &&
            !holding
          ) {
            cell.x = cell.homeX;
            cell.y = cell.homeY;
            cell.rot = 0;
            cell.vx = 0;
            cell.vy = 0;
            cell.vr = 0;
            hot.delete(i);
            continue;
          }
          moving = true;
          ctx.save();
          ctx.translate(cell.homeX, cell.homeY);
          ctx.fillStyle = paper;
          ctx.fill(cell.path);
          ctx.restore();
          drawShadow(cell, scale);
          drawPiece(cell, scale);
        }

        if (!moving && energy < 0.015 && hot.size === 0 && running && !holding) {
          running = false;
          gsap.ticker.remove(tick);
          blitBoard();
        }
      };

      startTick = () => {
        if (reduced || running || !ready || scrolling) return;
        running = true;
        gsap.ticker.add(tick);
      };

      const local = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const buzz = (pattern: number | number[]) => {
        try {
          navigator.vibrate?.(pattern);
        } catch {
          /* ignore */
        }
      };

      const shock = (clientX: number, clientY: number, kick: number, ring: boolean) => {
        if (scrolling) return;
        const p = local(clientX, clientY);
        aimX = p.x;
        aimY = p.y;
        cx = p.x;
        cy = p.y;
        energy = Math.min(1.4, kick);
        wave = ring ? 0 : 1.4;
        markNear(p.x, p.y, radiusFor());
        startTick();
      };

      const gust = (dir: 1 | -1) => {
        if (mousey || reduced || !ready || !visible || holding || scrolling) return;
        const now = performance.now();
        if (now - gustAt < 280) return;
        const rect = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const mid = rect.top + rect.height / 2;
        if (mid < vh * 0.12 || mid > vh * 0.88) return;
        if (Math.abs(mid - vh * 0.46) > vh * 0.34) return;
        if (energy > 0.4) return;
        gustAt = now;
        const x = rect.left + rect.width / 2;
        const y = rect.top + (dir > 0 ? size * 1.2 : rect.height - size * 1.2);
        shock(x, y, 0.95, true);
      };

      const cancelHold = () => {
        window.clearTimeout(holdTimer);
        holding = false;
      };

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (!ready) return;
        if (e.pointerType === "mouse") {
          const rect = wrap.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            energy = Math.min(energy, 0.45);
            return;
          }
          shock(e.clientX, e.clientY, Math.min(1.28, energy + 0.28), false);
          return;
        }
        if (!holding) {
          if (tapAt && Math.hypot(e.clientX - tapX, e.clientY - tapY) > 18) cancelHold();
          return;
        }
        const dx = e.clientX - tapX;
        const dy = e.clientY - tapY;
        if (Math.hypot(dx, dy) > 18 && Math.abs(dy) > Math.abs(dx) * 1.05) {
          cancelHold();
          snapHome();
          return;
        }
        shock(e.clientX, e.clientY, 1.2, false);
      });

      const onDown = safe((e: PointerEvent) => {
        if (e.button !== 0 || e.pointerType !== "mouse" || !ready) return;
        const rect = wrap.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
        shock(e.clientX, e.clientY, 1.35, true);
      });

      const onHostDown = safe((e: PointerEvent) => {
        if (e.pointerType === "mouse" || reduced) return;
        tapX = e.clientX;
        tapY = e.clientY;
        tapAt = performance.now();
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
          if (scrolling || !ready) return;
          holding = true;
          shock(tapX, tapY, 1.25, false);
          buzz(8);
        }, 70);
      });

      const onHostUp = safe((e: PointerEvent) => {
        if (e.pointerType === "mouse" || !ready) return;
        const held = holding;
        const dt = performance.now() - tapAt;
        const dist = Math.hypot(e.clientX - tapX, e.clientY - tapY);
        cancelHold();
        if (held) {
          energy = 0.22;
          startTick();
          return;
        }
        if (scrolling || dt > 420 || dist > 16) return;
        shock(e.clientX, e.clientY, 1.38, true);
        buzz([10, 32, 16]);
      });

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) enqueueLayout(layout);
          else if (running) {
            running = false;
            gsap.ticker.remove(tick);
          }
        },
        { rootMargin: "80px" },
      );
      io.observe(wrap);

      const ro = new ResizeObserver(() => {
        if (!visible) return;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => enqueueLayout(layout), 50);
      });
      ro.observe(wrap);

      const onPhoto = () => {
        if (visible) enqueueLayout(layout);
      };
      shot.addEventListener("load", onPhoto);
      shot.addEventListener("error", hideCanvas);
      if (shot.complete) onPhoto();

      const stopPulse = onScrollPulse((pulse) => {
        if (mousey) return;
        if (!pulse.settling) {
          scrolling = true;
          cancelHold();
          if (running || hot.size) snapHome();
          return;
        }
        scrolling = false;
        gust(pulse.dir);
      });

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      host?.addEventListener("pointerdown", onHostDown, { passive: true });
      host?.addEventListener("pointerup", onHostUp, { passive: true });
      host?.addEventListener("pointercancel", onHostUp, { passive: true });

      if (!mousey && !reduced) {
        breathTimer = window.setInterval(() => {
          if (!ready || !visible || holding || scrolling || energy > 0.14) return;
          const box = wrap.getBoundingClientRect();
          const vh = window.innerHeight;
          const mid = box.top + box.height / 2;
          if (mid < vh * 0.22 || mid > vh * 0.72) return;
          shock(box.left + box.width / 2, box.top + box.height / 2, 0.62, true);
        }, 2700);
      }

      return () => {
        window.clearTimeout(resizeTimer);
        window.clearTimeout(holdTimer);
        window.clearInterval(breathTimer);
        stopPulse();
        shot.removeEventListener("load", onPhoto);
        shot.removeEventListener("error", hideCanvas);
        shot.src = "";
        host?.classList.remove("puzzle-ready");
        io.disconnect();
        ro.disconnect();
        gsap.ticker.remove(tick);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        host?.removeEventListener("pointerdown", onHostDown);
        host?.removeEventListener("pointerup", onHostUp);
        host?.removeEventListener("pointercancel", onHostUp);
      };
    },
    { scope: wrapRef, dependencies: [product.id, product.image], revertOnUpdate: true },
  );

  return (
    <div ref={wrapRef} className="puzzle-play absolute inset-0 z-[1]" data-product-puzzle>
      <canvas ref={canvasRef} className="h-full w-full max-w-none opacity-0" aria-hidden />
    </div>
  );
}
