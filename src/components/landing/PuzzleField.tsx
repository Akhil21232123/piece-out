"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { onScrollPulse } from "@/lib/scrollPulse";

gsap.registerPlugin(useGSAP);
gsap.ticker.lagSmoothing(500, 16);

const FILLS = ["#f5c400", "#e31b23", "#1d4ed8", "#9b2242", "#fffaf3", "#efe8dc"];
const PAPER = "#efe8dc";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const wrap = wrapRef.current;
      const shift = shiftRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !shift || !canvas) return;
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const live =
        !reduced &&
        window.matchMedia("(pointer: fine)").matches &&
        window.matchMedia("(hover: hover)").matches;
      const board = document.createElement("canvas");
      const boardCtx = board.getContext("2d", { alpha: false })!;
      let cells: Cell[] = [];
      let dpr = 1;
      let width = 0;
      let height = 0;
      let size = 20;
      let scrolling = false;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let resizeAt = 0;
      let ticking = false;

      gsap.set(shift, { force3D: true });
      const yTo = gsap.quickTo(shift, "y", { duration: live ? 0.5 : 0.72, ease: "power3.out" });

      const paintCell = (
        g: CanvasRenderingContext2D,
        cell: Cell,
        ox: number,
        oy: number,
        rot: number,
      ) => {
        g.save();
        g.translate(cell.x + ox, cell.y + oy);
        g.rotate(rot);
        g.globalAlpha = cell.fill === "#efe8dc" ? 0.07 : 0.12;
        g.fillStyle = cell.fill;
        g.fill(cell.path);
        g.globalAlpha = 0.2;
        g.strokeStyle = "#171411";
        g.lineWidth = 0.8;
        g.lineJoin = "round";
        g.lineCap = "round";
        g.stroke(cell.path);
        g.restore();
      };

      const blit = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(board, 0, 0);
      };

      const parallax = () => {
        if (reduced) return;
        const vh = window.innerHeight;
        const max = vh * (live ? 0.055 : 0.1);
        const factor = live ? -0.028 : -0.055;
        yTo(Math.max(-max, Math.min(max, window.scrollY * factor)));
      };

      const layout = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.ceil(vw * 1.14);
        const h = Math.ceil(vh * 1.32);
        dpr = Math.min(2, window.devicePixelRatio || 1);
        width = w;
        height = h;
        shift.style.width = `${w}px`;
        shift.style.height = `${h}px`;
        shift.style.left = `${(vw - w) / 2}px`;
        shift.style.top = `${(vh - h) / 2}px`;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        board.width = canvas.width;
        board.height = canvas.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        boardCtx.imageSmoothingEnabled = true;
        boardCtx.imageSmoothingQuality = "high";

        size = w < 640 ? 18 : 20;
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
        boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        boardCtx.fillStyle = PAPER;
        boardCtx.fillRect(0, 0, w, h);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const homeX = ox + c * size;
            const homeY = oy + r * size;
            const cell: Cell = {
              homeX,
              homeY,
              x: homeX,
              y: homeY,
              rot: 0,
              fill: FILLS[(c * 3 + r * 5) % FILLS.length],
              path: jigPath(size, edgesFor(c, r, cols, rows)),
            };
            next.push(cell);
            paintCell(boardCtx, cell, 0, 0, 0);
          }
        }
        cells = next;
        blit();
        parallax();
      };

      const draw = () => {
        if (resizeAt && performance.now() - resizeAt > 50) {
          layout();
          resizeAt = 0;
        }
        if (scrolling || document.hidden) {
          blit();
          return;
        }

        const dt = Math.min(2, gsap.ticker.deltaRatio(60));
        cx += (aimX - cx) * (1 - Math.pow(0.82, dt));
        cy += (aimY - cy) * (1 - Math.pow(0.82, dt));
        energy *= Math.pow(0.91, dt);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = PAPER;
        ctx.fillRect(0, 0, width, height);

        const radius = 108;
        const r2 = radius * radius;
        const lift = 12 * energy;
        const t = performance.now() * 0.0007;
        const ease = 1 - Math.pow(0.78, dt);

        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const idleX = Math.sin(t + i * 0.37) * 0.55;
          const idleY = Math.cos(t * 0.9 + i * 0.29) * 0.55;
          let tx = cell.homeX;
          let ty = cell.homeY;
          let tr = 0;
          if (energy > 0.03) {
            const dx = cell.homeX - cx;
            const dy = cell.homeY - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.4) {
              const d = Math.sqrt(d2);
              const fall = (1 - d / radius) ** 2;
              tx += (dx / d) * fall * lift;
              ty += (dy / d) * fall * lift;
              tr = fall * 0.14 * (dx > 0 ? 1 : -1);
            }
          }
          cell.x += (tx - cell.x) * ease;
          cell.y += (ty - cell.y) * ease;
          cell.rot += (tr - cell.rot) * ease;
          paintCell(ctx, cell, idleX, idleY, cell.rot);
        }
        ctx.globalAlpha = 1;
      };

      const kick = () => {
        if (!live || ticking) return;
        ticking = true;
        gsap.ticker.add(draw);
      };

      layout();

      const onResize = () => {
        resizeAt = performance.now();
        if (live) kick();
        else layout();
      };

      const stopPulse = onScrollPulse((pulse) => {
        parallax();
        if (!live) return;
        if (!pulse.settling) {
          scrolling = true;
          blit();
          return;
        }
        scrolling = false;
        kick();
      });

      if (!live) {
        window.addEventListener("resize", onResize);
        window.visualViewport?.addEventListener("resize", onResize);
        return () => {
          stopPulse();
          window.removeEventListener("resize", onResize);
          window.visualViewport?.removeEventListener("resize", onResize);
        };
      }

      kick();
      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (e.pointerType !== "mouse" || scrolling) return;
        aimX = e.clientX - shift.getBoundingClientRect().left;
        aimY = e.clientY - shift.getBoundingClientRect().top;
        energy = Math.min(1.2, energy + 0.22);
      });

      const onDown = safe((e: PointerEvent) => {
        if (e.button !== 0 || e.pointerType !== "mouse") return;
        aimX = e.clientX - shift.getBoundingClientRect().left;
        aimY = e.clientY - shift.getBoundingClientRect().top;
        energy = 1.25;
      });

      const onVis = () => {
        if (document.hidden) blit();
        else kick();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        stopPulse();
        gsap.ticker.remove(draw);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
      };
    },
    { scope: wrapRef },
  );

  return (
    <div
      ref={wrapRef}
      className="puzzle-field-wrap pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-[#efe8dc]"
      aria-hidden
    >
      <div ref={shiftRef} className="puzzle-field-shift">
        <canvas ref={canvasRef} className="puzzle-field bg-[#efe8dc]" />
      </div>
    </div>
  );
}
