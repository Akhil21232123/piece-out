"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor, jigPath } from "@/lib/jigsaw";
import { onPeelBusy, peelBusy } from "@/lib/peelLock";
import { onScrollPulse, scrollBusy } from "@/lib/scrollPulse";

gsap.registerPlugin(useGSAP);
gsap.ticker.lagSmoothing(500, 33);

type Floater = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  rot: number;
  vx: number;
  vy: number;
  vr: number;
  size: number;
  path: Path2D;
  fill: string;
  stroke: string;
  drift: number;
  sway: number;
  phase: number;
  spin: number;
};

type Ripple = {
  x: number;
  y: number;
  size: number;
  life: number;
  path: Path2D;
};

type Mote = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  fill: string;
};

const FILLS = [
  "rgba(23,20,17,0.035)",
  "rgba(245,196,0,0.16)",
  "rgba(227,27,35,0.09)",
  "rgba(138,86,184,0.11)",
  "rgba(155,34,66,0.08)",
];

const STROKES = [
  "rgba(23,20,17,0.2)",
  "rgba(23,20,17,0.14)",
  "rgba(245,196,0,0.38)",
  "rgba(138,86,184,0.28)",
];

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function PuzzleField() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const phone =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLive(!phone && !reduced);
  }, []);

  if (!live) return null;
  return <PuzzleFieldLive />;
}

function PuzzleFieldLive() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goldRef = useRef<HTMLSpanElement>(null);
  const berryRef = useRef<HTMLSpanElement>(null);
  const violetRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const wrap = wrapRef.current;
      const shift = shiftRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !shift || !canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const phone =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
      if (phone || reduced) {
        canvas.style.display = "none";
        [goldRef.current, berryRef.current, violetRef.current].forEach((blob) => {
          if (blob) blob.style.display = "none";
        });
        return;
      }
      const interactive = !reduced;
      let pieces: Floater[] = [];
      let ripples: Ripple[] = [];
      let motes: Mote[] = [];
      let dpr = 1;
      let width = 0;
      let height = 0;
      let scrolling = false;
      let aimX = -9999;
      let aimY = -9999;
      let cx = 0;
      let cy = 0;
      let energy = 0;
      let resizeAt = 0;
      let ticking = false;
      let idle = 0;
      let boxes: DOMRect[] = [];
      let boxesAt = 0;
      let shiftL = 0;
      let shiftT = 0;
      let touchId = -1;

      gsap.set(shift, { force3D: true });
      const yTo = gsap.quickTo(shift, "y", { duration: phone ? 0.8 : 0.62, ease: "power3.out" });

      const blobs = [goldRef.current, berryRef.current, violetRef.current].filter(Boolean) as HTMLSpanElement[];
      if (!reduced && !phone && blobs.length) {
        blobs.forEach((blob, i) => {
          gsap.to(blob, {
            x: i === 1 ? -60 : 80,
            y: i === 2 ? 50 : -40,
            duration: 18 + i * 5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      }

      const syncShift = () => {
        const r = shift.getBoundingClientRect();
        shiftL = r.left;
        shiftT = r.top;
      };

      const refreshBoxes = () => {
        boxes = hostBoxes();
        boxesAt = performance.now();
      };

      const hostBoxes = () =>
        Array.from(document.querySelectorAll(".puzzle-host, [role=dialog]")).map((el) =>
          el.getBoundingClientRect(),
        );

      const hitsHost = (boxes: DOMRect[], x: number, y: number, size: number) => {
        const left = x + shiftL;
        const top = y + shiftT;
        const right = left + size;
        const bottom = top + size;
        return boxes.some(
          (box) =>
            right > box.left - 12 &&
            left < box.right + 12 &&
            bottom > box.top - 12 &&
            top < box.bottom + 12,
        );
      };

      const paintPiece = (g: CanvasRenderingContext2D, piece: Floater, glow: number) => {
        g.save();
        g.translate(piece.x, piece.y);
        g.rotate(piece.rot);
        g.globalAlpha = 0.72 + glow * 0.28;
        g.fillStyle = piece.fill;
        g.fill(piece.path);
        g.globalAlpha = 0.55 + glow * 0.45;
        g.strokeStyle = piece.stroke;
        g.lineWidth = 1.05 + glow * 0.55;
        g.lineJoin = "round";
        g.lineCap = "round";
        g.stroke(piece.path);
        g.restore();
      };

      const parallax = () => {
        if (reduced) return;
        const vh = window.innerHeight;
        const max = vh * (phone ? 0.07 : 0.045);
        const factor = phone ? -0.038 : -0.022;
        yTo(gsap.utils.clamp(-max, max, window.scrollY * factor));
      };

      const layout = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.ceil(vw * 1.12);
        const h = Math.ceil(vh * 1.22);
        dpr = Math.min(phone ? 1 : 1.15, window.devicePixelRatio || 1);
        width = w;
        height = h;
        shift.style.width = `${w}px`;
        shift.style.height = `${h}px`;
        shift.style.left = `${(vw - w) / 2}px`;
        shift.style.top = `${(vh - h) / 2}px`;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";

        const count = phone ? 8 : 12;
        const next: Floater[] = [];
        for (let guard = 0; next.length < count && guard < count * 28; guard++) {
          const n = next.length * 17 + guard * 3.1;
          const size = phone ? 62 + hash(n) * 42 : 78 + hash(n) * 56;
          const x = 40 + hash(n + 1.7) * (w - 80);
          const y = 40 + hash(n + 4.2) * (h - 80);
          if (next.some((p) => Math.hypot(p.homeX - x, p.homeY - y) < Math.max(p.size, size) * 1.05)) {
            continue;
          }
          const col = Math.floor(hash(n + 8) * 5);
          const row = Math.floor(hash(n + 9) * 5);
          next.push({
            homeX: x,
            homeY: y,
            x,
            y,
            rot: (hash(n + 2) - 0.5) * 0.7,
            vx: 0,
            vy: 0,
            vr: 0,
            size,
            path: jigPath(size, edgesFor(col, row, 6, 6)),
            fill: FILLS[Math.floor(hash(n + 11) * FILLS.length)],
            stroke: STROKES[Math.floor(hash(n + 13) * STROKES.length)],
            drift: 7 + hash(n + 15) * 11,
            sway: 0.18 + hash(n + 16) * 0.22,
            phase: hash(n + 18) * Math.PI * 2,
            spin: (hash(n + 19) - 0.5) * 0.08,
          });
        }
        pieces = next;

        motes = Array.from({ length: phone ? 0 : 4 }, (_, i) => {
          const n = i * 9.17;
          return {
            x: hash(n) * w,
            y: hash(n + 2) * h,
            r: 1.1 + hash(n + 3) * 2.2,
            vx: (hash(n + 4) - 0.5) * 8,
            vy: (hash(n + 5) - 0.5) * 6,
            a: 0.18 + hash(n + 6) * 0.28,
            fill: i % 3 === 0 ? "rgba(245,196,0,0.55)" : i % 3 === 1 ? "rgba(138,86,184,0.4)" : "rgba(23,20,17,0.22)",
          };
        });
        ripples = [];
        syncShift();
        parallax();
      };

      const draw = () => {
        if (resizeAt && performance.now() - resizeAt > 50) {
          layout();
          refreshBoxes();
          resizeAt = 0;
        }
        if (document.hidden || peelBusy()) {
          stopDraw();
          return;
        }

        const dt = Math.min(1, gsap.ticker.deltaRatio(60));
        const stepSec = Math.min(1 / 36, dt / 60);
        if (!scrolling) {
          cx += (aimX - cx) * (1 - Math.pow(0.58, dt));
          cy += (aimY - cy) * (1 - Math.pow(0.58, dt));
        }
        energy *= Math.pow(0.88, dt);

        const now = performance.now() / 1000;
        const radius = phone ? 58 : 64;
        const r2 = radius * radius;
        const lift = (phone ? 14 : 18) * Math.min(1, energy);
        const omega = 8.4;
        const zeta = 1.12;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (energy < 0.03 && ripples.length === 0) {
          idle += 1;
          if (idle > 24) {
            stopDraw();
            return;
          }
        } else {
          idle = 0;
        }

        if (performance.now() - boxesAt > 140) refreshBoxes();

        for (const mote of motes) {
          mote.x += mote.vx * stepSec;
          mote.y += mote.vy * stepSec;
          if (mote.x < -8) mote.x = width + 8;
          if (mote.x > width + 8) mote.x = -8;
          if (mote.y < -8) mote.y = height + 8;
          if (mote.y > height + 8) mote.y = -8;
          ctx.globalAlpha = mote.a * (0.45 + Math.min(1, energy) * 0.55);
          ctx.fillStyle = mote.fill;
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const piece of pieces) {
          let tx = piece.homeX + Math.sin(now * piece.sway + piece.phase) * piece.drift;
          let ty = piece.homeY + Math.cos(now * piece.sway * 0.72 + piece.phase) * (piece.drift * 0.7);
          let tr = piece.spin * Math.sin(now * 0.55 + piece.phase);
          let glow = 0;
          const dx = piece.homeX + piece.size / 2 - cx;
          const dy = piece.homeY + piece.size / 2 - cy;
          const d2 = dx * dx + dy * dy;
          if (!scrolling && d2 < r2 && d2 > 0.4 && lift > 0.35) {
            const d = Math.sqrt(d2);
            const fall = (1 - d / radius) ** 2.4;
            glow = fall;
            tx += (dx / d) * fall * lift;
            ty += (dy / d) * fall * lift;
            tr += fall * 0.1 * (dx > 0 ? 1 : -1);
          }
          const ax = -2 * zeta * omega * piece.vx - omega * omega * (piece.x - tx);
          const ay = -2 * zeta * omega * piece.vy - omega * omega * (piece.y - ty);
          const ar = -2 * zeta * omega * piece.vr - omega * omega * (piece.rot - tr);
          piece.vx += ax * stepSec;
          piece.vy += ay * stepSec;
          piece.vr += ar * stepSec;
          piece.x += piece.vx * stepSec;
          piece.y += piece.vy * stepSec;
          piece.rot += piece.vr * stepSec;
          if (hitsHost(boxes, piece.x, piece.y, piece.size)) continue;
          paintPiece(ctx, piece, glow);
        }

        const nextRipples: Ripple[] = [];
        for (const ripple of ripples) {
          ripple.size += (phone ? 22 : 28) * dt;
          ripple.life *= Math.pow(0.93, dt);
          if (ripple.life < 0.05) continue;
          ctx.save();
          ctx.translate(ripple.x, ripple.y);
          const s = ripple.size / 36;
          ctx.scale(s, s);
          ctx.globalAlpha = 0.55 * ripple.life;
          ctx.strokeStyle = "rgba(23,20,17,0.55)";
          ctx.lineWidth = 1.2 / s;
          ctx.lineJoin = "round";
          ctx.stroke(ripple.path);
          ctx.restore();
          nextRipples.push(ripple);
        }
        ripples = nextRipples;
        ctx.globalAlpha = 1;
      };

      const still = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const boxes = hostBoxes();
        for (const piece of pieces) {
          if (hitsHost(boxes, piece.x, piece.y, piece.size)) continue;
          paintPiece(ctx, piece, 0);
        }
      };

      const stopDraw = () => {
        ticking = false;
        gsap.ticker.remove(draw);
        still();
      };

      const kick = () => {
        if (!interactive || ticking || peelBusy()) return;
        ticking = true;
        gsap.ticker.add(draw);
      };

      const aim = (clientX: number, clientY: number, burst: number, splash: boolean) => {
        aimX = clientX - shiftL;
        aimY = clientY - shiftT;
        energy = Math.min(1.2, Math.max(energy, burst));
        if (splash) {
          ripples.push({
            x: aimX,
            y: aimY,
            size: 18,
            life: 1,
            path: jigPath(36, edgesFor(2, 1, 5, 5)),
          });
          if (ripples.length > 4) ripples.shift();
        }
        kick();
      };

      layout();
      refreshBoxes();
      still();
      if (!interactive) {
        /* painted once */
      }

      const onResize = () => {
        if (interactive && ticking) {
          resizeAt = performance.now();
          return;
        }
        layout();
        refreshBoxes();
        still();
      };

      const stopPulse = onScrollPulse((pulse) => {
        parallax();
        syncShift();
        refreshBoxes();
        if (!interactive) return;
        scrolling = !pulse.settling;
      });

      if (!interactive) {
        still();
        window.addEventListener("resize", onResize);
        window.visualViewport?.addEventListener("resize", onResize);
        return () => {
          stopPulse();
          window.removeEventListener("resize", onResize);
          window.visualViewport?.removeEventListener("resize", onResize);
        };
      }

      const blocked = (target: EventTarget | null) =>
        target instanceof Element &&
        Boolean(target.closest(".puzzle-host, [role=dialog], button, a, input, textarea"));

      const safe = contextSafe ?? ((fn: (e: PointerEvent) => void) => fn);

      const onMove = safe((e: PointerEvent) => {
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") {
          if (touchId < 0 || e.pointerId !== touchId) return;
          if (scrollBusy()) return;
        }
        if (blocked(e.target) || peelBusy()) {
          energy = 0;
          return;
        }
        aim(e.clientX, e.clientY, e.pointerType === "mouse" ? 1 : 1.14, false);
      });

      const onDown = safe((e: PointerEvent) => {
        if (e.button !== 0) return;
        if (blocked(e.target)) return;
        syncShift();
        if (e.pointerType !== "mouse" && e.pointerType !== "pen") touchId = e.pointerId;
        aim(e.clientX, e.clientY, 1.2, true);
      });

      const onUp = safe((e: PointerEvent) => {
        if (e.pointerId === touchId) touchId = -1;
      });

      const onVis = () => {
        if (document.hidden || peelBusy()) {
          stopDraw();
          return;
        }
        kick();
      };

      const stopBusy = onPeelBusy((n) => {
        if (n > 0) {
          energy = 0;
          ripples = [];
          stopDraw();
        } else {
          kick();
        }
      });

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        stopBusy();
        stopPulse();
        gsap.ticker.remove(draw);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
      };
    },
    { scope: wrapRef },
  );

  return (
    <div ref={wrapRef} className="puzzle-field-wrap pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="site-aurora">
        <span ref={goldRef} className="site-blob site-blob-gold" />
        <span ref={berryRef} className="site-blob site-blob-berry" />
        <span ref={violetRef} className="site-blob site-blob-violet" />
      </div>
      <div className="site-grain" />
      <div ref={shiftRef} className="puzzle-field-shift">
        <canvas ref={canvasRef} className="puzzle-field" />
      </div>
    </div>
  );
}
