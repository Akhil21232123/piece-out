"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";

function smooth(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

type Spark = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  gold: boolean;
  size: number;
};

export function Gathering() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const sparks: Spark[] = [];

    const outline = (w: number, h: number, i: number, n: number) => {
      const u = i / n;
      const cx = w * 0.5;
      const cy = h * 0.52;
      if (u < 0.55) {
        const a = (u / 0.55) * Math.PI;
        return {
          x: cx + Math.cos(a) * w * 0.13,
          y: cy - h * 0.02 - Math.sin(a) * h * 0.09,
        };
      }
      const v = (u - 0.55) / 0.45;
      const bw = w * 0.16;
      const bh = h * 0.07;
      const pts = [
        [cx - bw, cy],
        [cx + bw, cy],
        [cx + bw, cy + bh],
        [cx - bw, cy + bh],
      ];
      const seg = Math.min(3, Math.floor(v * 4));
      const local = v * 4 - seg;
      const a = pts[seg];
      const b = pts[(seg + 1) % 4];
      return { x: a[0] + (b[0] - a[0]) * local, y: a[1] + (b[1] - a[1]) * local };
    };

    const seed = (w: number, h: number) => {
      sparks.length = 0;
      const n = Math.min(220, Math.floor((w * h) / 9000));
      for (let i = 0; i < n; i++) {
        const edge = Math.random();
        let ox = 0;
        let oy = 0;
        if (edge < 0.25) {
          ox = Math.random() * w;
          oy = -20;
        } else if (edge < 0.5) {
          ox = Math.random() * w;
          oy = h + 20;
        } else if (edge < 0.75) {
          ox = -20;
          oy = Math.random() * h;
        } else {
          ox = w + 20;
          oy = Math.random() * h;
        }
        const dest = outline(w, h, i, n);
        sparks.push({
          x: ox,
          y: oy,
          ox,
          oy,
          tx: dest.x + (Math.random() - 0.5) * 8,
          ty: dest.y + (Math.random() - 0.5) * 8,
          gold: i % 3 !== 0,
          size: 0.7 + Math.random() * 1.8,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      const t = useChamberStore.getState().gatherT;
      ctx.clearRect(0, 0, width, height);
      if (t <= 0.001) return;

      const cx = width * 0.5;
      const cy = height * 0.52;
      const inward = smooth(0.02, 0.62, t);
      const bloom = smooth(0.48, 0.72, t);
      const hold = smooth(0.62, 0.88, t);
      const release = smooth(0.88, 1, t);

      ctx.globalCompositeOperation = "lighter";
      const shaft = bloom * (1 - release * 0.65);
      if (shaft > 0.02) {
        const grd = ctx.createLinearGradient(cx, 0, cx, height * 0.72);
        grd.addColorStop(0, `rgba(232, 210, 176, ${0.18 * shaft})`);
        grd.addColorStop(0.45, `rgba(196, 165, 116, ${0.08 * shaft})`);
        grd.addColorStop(1, "rgba(196, 165, 116, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(cx - 10, 0);
        ctx.lineTo(cx + 10, 0);
        ctx.lineTo(cx + width * 0.12, height * 0.72);
        ctx.lineTo(cx - width * 0.12, height * 0.72);
        ctx.fill();
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 + bloom * 80);
      core.addColorStop(0, `rgba(255, 236, 200, ${0.22 * bloom})`);
      core.addColorStop(0.35, `rgba(196, 165, 116, ${0.1 * bloom})`);
      core.addColorStop(1, "rgba(107, 15, 42, 0)");
      ctx.fillStyle = core;
      ctx.fillRect(cx - 200, cy - 200, 400, 400);

      ctx.strokeStyle = `rgba(196, 165, 116, ${0.45 * bloom * (1 - release)})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy - height * 0.02, width * 0.13 * (0.6 + hold * 0.4), height * 0.09 * (0.6 + hold * 0.4), 0, 0, Math.PI * 2);
      ctx.stroke();

      for (const spark of sparks) {
        const nx = spark.ox + (spark.tx - spark.ox) * inward;
        const ny = spark.oy + (spark.ty - spark.oy) * inward;
        spark.x = nx + (spark.ox - cx) * release * 0.35;
        spark.y = ny + (spark.oy - cy) * release * 0.35;
        ctx.globalAlpha = (0.25 + hold * 0.65) * (1 - release * 0.85);
        ctx.fillStyle = spark.gold ? "#e8d4a8" : "#8a3a4c";
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * (0.7 + hold * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="intro-gather" aria-hidden />;
}
